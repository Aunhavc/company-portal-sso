import { describe, it, expect, beforeEach } from 'vitest'
import { gateBeforeOpen, rememberProceed, forgetProceeds } from '../intranetGate'
import type { AppEntry, HealthResult } from '../types'

// เหตุการณ์จริง 7 ก.ย. 2569: osTicket (intranet, HTTP, ไม่มี health_url) คลิกจากนอก LAN
// แล้ว "เงียบ" — พอร์ทัลเปิดแท็บไปเลยโดยไม่บอกว่าต้องต่อ VPN
const app = (over: Partial<AppEntry> = {}): AppEntry => ({
  id: 7,
  slug: 'osticket',
  name: 'osTicket',
  description: null,
  category: 'บริการ IT',
  network: 'intranet',
  url: 'http://192.168.0.250/osticket/',
  sso_url: null,
  health_url: null,
  icon: '🎫',
  accent: 'amber',
  open_in_new_tab: true,
  allowed_roles: ['user', 'admin'],
  sort_order: 0,
  is_active: true,
  created_at: '',
  updated_at: '',
  ...over,
})
const h = (state: HealthResult['state']): HealthResult => ({ state, checkedAt: 1 })

beforeEach(() => forgetProceeds())

describe('gateBeforeOpen', () => {
  it('แอปอินเทอร์เน็ต → เปิดได้เลยเสมอ', () => {
    expect(gateBeforeOpen(app({ network: 'internet' }), undefined)).toBe('open')
    expect(gateBeforeOpen(app({ network: 'internet' }), h('offline'))).toBe('open')
  })

  it('แอปภายในที่ตรวจแล้วถึง → เปิดได้เลย', () => {
    expect(gateBeforeOpen(app(), h('online'))).toBe('open')
  })

  it('แอปภายในที่ตรวจแล้วไม่ถึง / ถูกบล็อก → ถามก่อน', () => {
    expect(gateBeforeOpen(app(), h('offline'))).toBe('ask')
    expect(gateBeforeOpen(app(), h('blocked'))).toBe('ask')
  })

  // ด่านหลักของบั๊ก osTicket
  it('แอปภายในที่ไม่มี health check (ไม่รู้สถานะ) → ถามก่อน ไม่เปิดเงียบ ๆ', () => {
    expect(gateBeforeOpen(app(), undefined)).toBe('ask')
    expect(gateBeforeOpen(app(), h('unknown'))).toBe('ask')
    expect(gateBeforeOpen(app(), h('checking'))).toBe('ask')
  })

  it('ผู้ใช้กด "เปิดต่อไปเลย" แล้ว → ครั้งถัดไปในแท็บเดียวกันไม่ถามซ้ำ (เฉพาะแอปนั้น)', () => {
    rememberProceed(app())
    expect(gateBeforeOpen(app(), undefined)).toBe('open')
    expect(gateBeforeOpen(app({ id: 8, slug: 'wms' }), undefined)).toBe('ask')
  })

  it('จำคำตอบ "เปิดต่อไปเลย" ไม่ทับกรณีที่ตรวจแล้วรู้ชัดว่าไม่ถึง', () => {
    rememberProceed(app())
    expect(gateBeforeOpen(app(), h('offline'))).toBe('ask')
  })

  // vitest.setup.ts ให้ sessionStorage แบบ writable — สลับตัวจริงออกชั่วคราวได้
  const g = globalThis as unknown as { sessionStorage: Storage }

  it('ทำงานได้แม้ sessionStorage โยน error (โหมดส่วนตัวบางเบราว์เซอร์) — จำในหน่วยความจำแทน', () => {
    const original = g.sessionStorage
    const boom = () => {
      throw new Error('SecurityError')
    }
    g.sessionStorage = { getItem: boom, setItem: boom, removeItem: boom } as unknown as Storage
    try {
      expect(() => rememberProceed(app())).not.toThrow()
      expect(gateBeforeOpen(app(), undefined)).toBe('open')
    } finally {
      g.sessionStorage = original
    }
  })

  it('จำข้ามการโหลดหน้าใหม่ในแท็บเดิมผ่าน sessionStorage', () => {
    rememberProceed(app())
    forgetProceeds({ memoryOnly: true }) // จำลองโหลดหน้าใหม่: หน่วยความจำหาย แต่ sessionStorage ยังอยู่
    expect(gateBeforeOpen(app(), undefined)).toBe('open')
  })
})
