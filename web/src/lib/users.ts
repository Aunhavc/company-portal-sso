import type { Profile, UserRole } from './types'

/**
 * ตรรกะล้วนของหน้าจัดการผู้ใช้ — แยกจาก React เพื่อให้ทดสอบได้ครบทุกกรณี
 *
 * กฎที่สำคัญที่สุดคือ "ห้ามทำให้ระบบไม่เหลือผู้ดูแลที่ใช้งานได้"
 * เพราะถ้าพลาด จะต้องกลับไปแก้ด้วย SQL ซึ่งเป็นสิ่งที่หน้านี้มีไว้เพื่อหลีกเลี่ยง
 */

export type IdentitySource = 'ad' | 'google' | 'password' | 'other'

/** ดูจาก sub ของ Auth0 ว่าผู้ใช้เข้ามาทางไหน */
export function identitySource(id: string): IdentitySource {
  if (id.startsWith('ad|')) return 'ad'
  if (id.startsWith('google-oauth2|')) return 'google'
  if (id.startsWith('auth0|')) return 'password'
  return 'other'
}

export const IDENTITY_LABEL: Record<IdentitySource, string> = {
  ad: 'บัญชีพนักงาน (AD)',
  google: 'Google',
  password: 'อีเมล + รหัสผ่าน',
  other: 'อื่น ๆ',
}

/** ผู้ดูแลที่ยังใช้งานได้มีกี่คน */
export function activeAdminCount(list: Profile[]): number {
  return list.filter((p) => p.role === 'admin' && p.is_active).length
}

export interface ProfileChange {
  role?: UserRole
  is_active?: boolean
}

/**
 * ตรวจว่าการเปลี่ยนแปลงนี้ทำได้หรือไม่
 * คืนข้อความอธิบายถ้าทำไม่ได้ คืน null ถ้าทำได้
 */
export function blockReason(
  target: Profile,
  change: ProfileChange,
  list: Profile[],
  currentUserId: string,
): string | null {
  if (target.id === currentUserId) {
    return 'แก้ไขบัญชีของตัวเองไม่ได้ — ให้ผู้ดูแลอีกคนเป็นผู้แก้ไขให้'
  }

  const nextRole = change.role ?? target.role
  const nextActive = change.is_active ?? target.is_active
  const stillAdmin = nextRole === 'admin' && nextActive
  const wasAdmin = target.role === 'admin' && target.is_active

  if (wasAdmin && !stillAdmin && activeAdminCount(list) <= 1) {
    return 'ต้องเหลือผู้ดูแลระบบที่ใช้งานได้อย่างน้อย 1 คน'
  }

  return null
}

/** เรียงคนที่รออนุมัติขึ้นก่อน แล้วเรียงตามเวลาสร้างจากใหม่ไปเก่า */
export function sortProfiles(list: Profile[]): Profile[] {
  return [...list].sort((a, b) => {
    if (a.is_active !== b.is_active) return a.is_active ? 1 : -1
    return b.created_at.localeCompare(a.created_at)
  })
}

/** จำนวนคนที่รออนุมัติ — ใช้แสดงป้ายแจ้งเตือน */
export function pendingCount(list: Profile[]): number {
  return list.filter((p) => !p.is_active).length
}
