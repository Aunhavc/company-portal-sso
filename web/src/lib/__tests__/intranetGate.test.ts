import { describe, it, expect } from 'vitest'
import { gateBeforeOpen } from '../intranetGate'
import type { AppEntry, HealthResult } from '../types'

// เหตุการณ์จริง 7 ก.ย. 2569: osTicket (intranet, HTTP, ไม่มี health_url) คลิกจากนอก LAN
// แล้ว "เงียบ" — พอร์ทัลเปิดแท็บไปเลยโดยไม่บอกว่าต้องต่อ VPN
// และรอบสอง: จำคำตอบ "เปิดเลย" จากตอนอยู่ LAN ไว้ พอสลับไป Hotspot ก็เปิดตรงอีก
// → ต้องถามทุกครั้ง ไม่ว่าเหตุผลใด ถ้ายืนยันไม่ได้ว่าถึง
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

  it('ถามซ้ำทุกครั้ง — ไม่จำคำตอบเดิม เพราะผู้ใช้อาจสลับเครือข่ายไปแล้ว', () => {
    expect(gateBeforeOpen(app(), undefined)).toBe('ask')
    expect(gateBeforeOpen(app(), undefined)).toBe('ask')
  })
})
