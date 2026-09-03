import { describe, it, expect } from 'vitest'
import {
  IDENTITY_LABEL,
  activeAdminCount,
  blockReason,
  identitySource,
  pendingCount,
  sortProfiles,
} from '../users'
import type { Profile } from '../types'

const p = (over: Partial<Profile> & { id: string }): Profile => ({
  email: `${over.id}@example.com`,
  full_name: null,
  avatar_url: null,
  role: 'user',
  department: null,
  is_active: true,
  last_login_at: null,
  created_at: '2026-09-01T00:00:00Z',
  updated_at: '2026-09-01T00:00:00Z',
  ...over,
})

describe('identitySource', () => {
  it('แยกช่องทางจาก sub ของ Auth0 ได้ถูกต้อง', () => {
    expect(identitySource('ad|somjai-ad|abc')).toBe('ad')
    expect(identitySource('google-oauth2|1031')).toBe('google')
    expect(identitySource('auth0|xyz')).toBe('password')
    expect(identitySource('samlp|okta|zzz')).toBe('other')
  })

  it('ทุกช่องทางมีชื่อภาษาไทยกำกับ', () => {
    for (const key of ['ad', 'google', 'password', 'other'] as const) {
      expect(IDENTITY_LABEL[key].length).toBeGreaterThan(0)
    }
  })
})

describe('activeAdminCount', () => {
  it('นับเฉพาะผู้ดูแลที่ยังใช้งานได้', () => {
    const list = [
      p({ id: 'a', role: 'admin', is_active: true }),
      p({ id: 'b', role: 'admin', is_active: false }),
      p({ id: 'c', role: 'user', is_active: true }),
    ]
    expect(activeAdminCount(list)).toBe(1)
  })
})

describe('blockReason — กันไม่ให้ระบบเสียหาย', () => {
  const admin1 = p({ id: 'admin-1', role: 'admin', is_active: true })
  const admin2 = p({ id: 'admin-2', role: 'admin', is_active: true })
  const user1 = p({ id: 'user-1' })

  it('ห้ามแก้บัญชีของตัวเอง', () => {
    const list = [admin1, admin2, user1]
    expect(blockReason(admin1, { role: 'user' }, list, 'admin-1')).toContain('ตัวเอง')
    expect(blockReason(admin1, { is_active: false }, list, 'admin-1')).toContain('ตัวเอง')
  })

  // กฎสำคัญที่สุด — ถ้าพลาดจะต้องกลับไปแก้ด้วย SQL ซึ่งหน้านี้มีไว้เพื่อเลี่ยง
  it('ห้ามถอดสิทธิ์ผู้ดูแลคนสุดท้ายที่ใช้งานได้', () => {
    const list = [admin2, user1]
    expect(blockReason(admin2, { role: 'user' }, list, 'user-1')).toContain('อย่างน้อย 1 คน')
  })

  it('ห้ามระงับผู้ดูแลคนสุดท้ายที่ใช้งานได้', () => {
    const list = [admin2, user1]
    expect(blockReason(admin2, { is_active: false }, list, 'user-1')).toContain('อย่างน้อย 1 คน')
  })

  it('ถอดสิทธิ์ผู้ดูแลได้ถ้ายังเหลืออีกคน', () => {
    const list = [admin1, admin2, user1]
    expect(blockReason(admin2, { role: 'user' }, list, 'admin-1')).toBeNull()
  })

  it('อนุมัติหรือระงับผู้ใช้ทั่วไปได้เสมอ', () => {
    const list = [admin2, user1]
    expect(blockReason(user1, { is_active: false }, list, 'admin-2')).toBeNull()
    expect(blockReason(user1, { is_active: true }, list, 'admin-2')).toBeNull()
    expect(blockReason(user1, { role: 'admin' }, list, 'admin-2')).toBeNull()
  })

  it('ผู้ดูแลที่ถูกระงับอยู่แล้ว ไม่นับเป็นผู้ดูแลที่เหลืออยู่', () => {
    const suspended = p({ id: 'admin-3', role: 'admin', is_active: false })
    const list = [admin2, suspended]
    // เหลือ admin ใช้งานได้คนเดียวคือ admin-2 จึงถอดไม่ได้
    expect(blockReason(admin2, { role: 'user' }, list, 'admin-3')).toContain('อย่างน้อย 1 คน')
    // ส่วนคนที่ถูกระงับอยู่แล้ว แก้ได้ไม่กระทบใคร
    expect(blockReason(suspended, { role: 'user' }, list, 'admin-2')).toBeNull()
  })
})

describe('sortProfiles', () => {
  it('คนรออนุมัติขึ้นก่อนเสมอ', () => {
    const list = [
      p({ id: 'active', is_active: true, created_at: '2026-09-03T00:00:00Z' }),
      p({ id: 'pending', is_active: false, created_at: '2026-09-01T00:00:00Z' }),
    ]
    expect(sortProfiles(list).map((x) => x.id)).toEqual(['pending', 'active'])
  })

  it('ในกลุ่มเดียวกันเรียงจากใหม่ไปเก่า', () => {
    const list = [
      p({ id: 'old', created_at: '2026-09-01T00:00:00Z' }),
      p({ id: 'new', created_at: '2026-09-03T00:00:00Z' }),
    ]
    expect(sortProfiles(list).map((x) => x.id)).toEqual(['new', 'old'])
  })

  it('ไม่แก้ไขอาร์เรย์ต้นฉบับ', () => {
    const list = [p({ id: 'a', is_active: true }), p({ id: 'b', is_active: false })]
    const before = list.map((x) => x.id)
    sortProfiles(list)
    expect(list.map((x) => x.id)).toEqual(before)
  })
})

describe('pendingCount', () => {
  it('นับเฉพาะคนที่ยังไม่อนุมัติ', () => {
    expect(
      pendingCount([
        p({ id: 'a', is_active: true }),
        p({ id: 'b', is_active: false }),
        p({ id: 'c', is_active: false }),
      ]),
    ).toBe(2)
  })

  it('ไม่มีใครรออนุมัติ = 0', () => {
    expect(pendingCount([p({ id: 'a' })])).toBe(0)
    expect(pendingCount([])).toBe(0)
  })
})
