import type { Profile } from './types'

/**
 * ตัดสินว่าหน้าจอไหนควรถูกแสดง — แยกออกมาเป็นฟังก์ชันล้วนเพื่อให้ทดสอบได้ครบทุกกรณี
 *
 * ⚠️ นี่เป็นเพียงการจัดหน้าจอ ไม่ใช่ด่านความปลอดภัย
 *    ด่านจริงคือ RLS ใน Postgres (ดู 0006_access_approval.sql)
 *    ผู้ใช้ที่ยังไม่อนุมัติจะอ่านตาราง apps และ announcements ไม่ได้อยู่แล้ว
 *    ต่อให้ยิง API ตรง ๆ ข้ามหน้าเว็บไป
 */
export type PortalView = 'loading' | 'login' | 'sync-error' | 'pending' | 'portal'

export interface ViewInput {
  isLoading: boolean
  isAuthenticated: boolean
  profile: Profile | null
}

export function resolveView({ isLoading, isAuthenticated, profile }: ViewInput): PortalView {
  if (isLoading) return 'loading'
  if (!isAuthenticated) return 'login'
  if (!profile) return 'sync-error'
  if (!profile.is_active) return 'pending'
  return 'portal'
}
