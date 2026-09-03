import { describe, it, expect } from 'vitest'
import { resolveView } from '../access'
import type { Profile } from '../types'

const profile = (over: Partial<Profile> = {}): Profile => ({
  id: 'ad|somjai-ad|abc',
  email: 'someone@example.com',
  full_name: 'ทดสอบ ระบบ',
  avatar_url: null,
  role: 'user',
  department: null,
  is_active: true,
  last_login_at: null,
  created_at: '2026-09-03T00:00:00Z',
  updated_at: '2026-09-03T00:00:00Z',
  ...over,
})

describe('resolveView', () => {
  it('กำลังโหลด มาก่อนทุกกรณี', () => {
    expect(
      resolveView({ isLoading: true, isAuthenticated: true, profile: profile() }),
    ).toBe('loading')
    expect(
      resolveView({ isLoading: true, isAuthenticated: false, profile: null }),
    ).toBe('loading')
  })

  it('ยังไม่ล็อกอิน → หน้าล็อกอิน', () => {
    expect(resolveView({ isLoading: false, isAuthenticated: false, profile: null })).toBe('login')
  })

  it('ล็อกอินแล้วแต่ไม่มีโปรไฟล์ → หน้าแจ้งเชื่อมต่อฐานข้อมูลไม่สำเร็จ', () => {
    expect(resolveView({ isLoading: false, isAuthenticated: true, profile: null })).toBe(
      'sync-error',
    )
  })

  // ด่านหลักของ migration 0006 — บัญชีใหม่นอก AD ต้องรออนุมัติ
  it('โปรไฟล์ยังไม่อนุมัติ → หน้ารออนุมัติ ไม่ใช่หน้าพอร์ทัล', () => {
    expect(
      resolveView({
        isLoading: false,
        isAuthenticated: true,
        profile: profile({ is_active: false }),
      }),
    ).toBe('pending')
  })

  it('ผู้ดูแลที่ถูกระงับก็ต้องเข้าไม่ได้เช่นกัน', () => {
    expect(
      resolveView({
        isLoading: false,
        isAuthenticated: true,
        profile: profile({ role: 'admin', is_active: false }),
      }),
    ).toBe('pending')
  })

  it('โปรไฟล์อนุมัติแล้ว → เข้าพอร์ทัลได้', () => {
    expect(
      resolveView({ isLoading: false, isAuthenticated: true, profile: profile() }),
    ).toBe('portal')
  })

  it('ไม่มีทางไปหน้าพอร์ทัลได้เลยถ้ายังไม่อนุมัติ ไม่ว่าค่าอื่นจะเป็นอย่างไร', () => {
    for (const role of ['user', 'admin'] as const) {
      for (const isAuthenticated of [true, false]) {
        const view = resolveView({
          isLoading: false,
          isAuthenticated,
          profile: profile({ role, is_active: false }),
        })
        expect(view).not.toBe('portal')
      }
    }
  })
})
