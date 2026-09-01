export type NetworkZone = 'internet' | 'intranet'

export type AccentColor =
  | 'slate' | 'blue' | 'emerald' | 'amber' | 'rose' | 'violet' | 'cyan' | 'orange'

export type UserRole = 'user' | 'admin'

export interface Profile {
  id: string
  email: string
  full_name: string | null
  avatar_url: string | null
  role: UserRole
  department: string | null
  is_active: boolean
  last_login_at: string | null
  created_at: string
  updated_at: string
}

export interface AppEntry {
  id: number
  slug: string
  name: string
  description: string | null
  category: string
  network: NetworkZone
  /** ปลายทางเมื่อคลิก */
  url: string
  /** ถ้ามี จะใช้แทน url เพื่อให้ผ่าน SSO handshake ก่อน */
  sso_url: string | null
  /** endpoint สำหรับตรวจสถานะ (เช่น .../ping.php) */
  health_url: string | null
  icon: string
  accent: AccentColor
  open_in_new_tab: boolean
  allowed_roles: UserRole[]
  sort_order: number
  is_active: boolean
  created_at: string
  updated_at: string
}

/** payload ที่ใช้ตอนสร้าง/แก้ไขแอปจากหน้า Admin */
export type AppInput = Omit<AppEntry, 'id' | 'created_at' | 'updated_at'>

export type AnnouncementCategory = 'General' | 'HR' | 'IT Alert' | 'Announcement'

export interface Announcement {
  id: number
  title: string
  content: string
  category: AnnouncementCategory
  is_pinned: boolean
  published: boolean
  published_at: string
  author_id: string | null
  created_at: string
  updated_at: string
}

export type HealthState = 'unknown' | 'checking' | 'online' | 'offline' | 'blocked'

export interface HealthResult {
  state: HealthState
  checkedAt: number
  latencyMs?: number
  /** ข้อความอธิบายเมื่อ state = 'blocked' (เช่น mixed content) */
  reason?: string
}

/** ค่าตั้งค่าองค์กรที่ผู้ดูแลระบบแก้ได้จากหน้าเว็บ */
export interface Settings {
  company_name: string
  /** โลโก้ — เก็บเป็น data URI ที่อัปโหลดเอง หรือ URL ภายนอกก็ได้ เว้นว่าง = ใช้ตัวย่อ CP */
  logo_url: string
  portal_tagline: string
  helpdesk_phone: string
  helpdesk_email: string
}

export const SETTING_LABELS: Record<keyof Settings, string> = {
  company_name: 'ชื่อบริษัท',
  logo_url: 'โลโก้',
  portal_tagline: 'คำบรรยายใต้ชื่อ',
  helpdesk_phone: 'เบอร์ติดต่อ IT Helpdesk',
  helpdesk_email: 'อีเมล IT Helpdesk',
}
