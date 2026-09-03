import { describe, it, expect, beforeEach } from 'vitest'
import { demoStore } from '../demoStore'
import type { AppInput } from '../types'

const base: AppInput = {
  slug: 'test-app',
  name: 'ระบบทดสอบ',
  description: null,
  category: 'ทั่วไป',
  network: 'internet',
  url: 'https://example.com',
  sso_url: null,
  health_url: null,
  icon: '🗂️',
  accent: 'blue',
  allowed_roles: ['user', 'admin'],
  is_active: true,
  open_in_new_tab: true,
  sort_order: 100,
}

beforeEach(() => localStorage.clear())

describe('demoStore', () => {
  // ด่านกันบั๊กที่เคยเจอ: listApps() ไม่กรอง is_active ทำให้หน้าพนักงานเห็นแอปที่ปิดอยู่
  it('listApps คืนเฉพาะแอปที่เปิดใช้งาน', () => {
    demoStore.createApp({ ...base, slug: 'on', name: 'เปิด', is_active: true })
    demoStore.createApp({ ...base, slug: 'off', name: 'ปิด', is_active: false })
    const slugs = demoStore.listApps().map((a) => a.slug)
    expect(slugs).toContain('on')
    expect(slugs).not.toContain('off')
  })

  it('listAllApps คืนทั้งที่เปิดและปิด', () => {
    demoStore.createApp({ ...base, slug: 'on', is_active: true })
    demoStore.createApp({ ...base, slug: 'off', is_active: false })
    const slugs = demoStore.listAllApps().map((a) => a.slug)
    expect(slugs).toContain('on')
    expect(slugs).toContain('off')
  })

  // ด่านกันบั๊กข้อมูลหาย: createApp เคยอ่านผ่าน listApps() แล้วเขียนทับ
  // ทำให้แอปที่ปิดใช้งานอยู่หายไปทั้งหมดทุกครั้งที่เพิ่มแอปใหม่
  it('createApp ไม่ทำให้แอปที่ปิดใช้งานหายไป', () => {
    demoStore.createApp({ ...base, slug: 'disabled-one', is_active: false })
    const before = demoStore.listAllApps().length
    demoStore.createApp({ ...base, slug: 'brand-new', is_active: true })
    const after = demoStore.listAllApps()
    expect(after.length).toBe(before + 1)
    expect(after.map((a) => a.slug)).toContain('disabled-one')
  })

  it('updateApp ไม่ทำให้แอปที่ปิดใช้งานหายไป', () => {
    const disabled = demoStore.createApp({ ...base, slug: 'disabled-two', is_active: false })
    const target = demoStore.createApp({ ...base, slug: 'target', is_active: true })
    demoStore.updateApp(target.id, { ...base, slug: 'target', name: 'ชื่อใหม่' })
    const all = demoStore.listAllApps()
    expect(all.map((a) => a.id)).toContain(disabled.id)
    expect(all.find((a) => a.id === target.id)?.name).toBe('ชื่อใหม่')
  })

  it('deleteApp ลบเฉพาะรายการที่ระบุ', () => {
    const keep = demoStore.createApp({ ...base, slug: 'keep', is_active: false })
    const drop = demoStore.createApp({ ...base, slug: 'drop', is_active: true })
    demoStore.deleteApp(drop.id)
    const ids = demoStore.listAllApps().map((a) => a.id)
    expect(ids).toContain(keep.id)
    expect(ids).not.toContain(drop.id)
  })

  it('createApp ให้ id ไม่ซ้ำกันแม้เพิ่มติดกันหลายรายการ', () => {
    const ids = ['a', 'b', 'c'].map((s) => demoStore.createApp({ ...base, slug: s }).id)
    expect(new Set(ids).size).toBe(ids.length)
  })
})
