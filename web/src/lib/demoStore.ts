/**
 * คลังข้อมูลจำลองสำหรับ "โหมดสาธิต"
 *
 * ใช้เมื่อยังไม่ได้ตั้งค่า Auth0/Supabase — เก็บลง localStorage
 * เพื่อให้ทดลองเพิ่ม/แก้/ลบแอปได้จริงก่อนต่อระบบหลังบ้าน
 * โครงสร้างข้อมูลเหมือนกับตารางบน Supabase ทุกฟิลด์
 */
import type { Announcement, AppEntry, AppInput, Profile } from './types'

const KEY_APPS = 'portal.demo.apps.v1'
const KEY_ANN = 'portal.demo.announcements.v1'

const now = () => new Date().toISOString()

function read<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key)
    return raw ? (JSON.parse(raw) as T) : fallback
  } catch {
    return fallback
  }
}

function write<T>(key: string, value: T) {
  try {
    localStorage.setItem(key, JSON.stringify(value))
  } catch {
    /* โหมดส่วนตัว / โควตาเต็ม — ปล่อยผ่าน */
  }
}

export const demoProfile: Profile = {
  id: 'demo|000000000000',
  email: 'somchai.d@example.com',
  full_name: 'สมชาย เดโม (โหมดสาธิต)',
  avatar_url: null,
  role: 'admin',
  department: 'Information Technology',
  is_active: true,
  last_login_at: now(),
  created_at: now(),
  updated_at: now(),
}

const seedApps: AppEntry[] = [
  {
    id: 1, slug: 'cloud-ops', name: 'Cloud Operations Portal',
    description: 'ระบบปฏิบัติการงานส่วนหน้าบนคลาวด์ เข้าได้จากทุกที่ทุกเวลา',
    category: 'ระบบงานหลัก', network: 'internet',
    url: 'https://ops.example.com', sso_url: null, health_url: null,
    icon: '☁️', accent: 'blue', open_in_new_tab: true,
    allowed_roles: ['user', 'admin'], sort_order: 10, is_active: true,
    created_at: now(), updated_at: now(),
  },
  {
    id: 2, slug: 'erp', name: 'ERP System',
    description: 'ระบบ ERP ภายในองค์กร ต้องเชื่อมต่อ VPN ก่อนเข้าใช้งาน',
    category: 'ระบบงานหลัก', network: 'intranet',
    url: 'https://erp.example.local/dashboard.php',
    sso_url: 'https://erp.example.local/auth-callback.php',
    health_url: 'https://erp.example.local/ping.php',
    icon: '🏭', accent: 'emerald', open_in_new_tab: false,
    allowed_roles: ['user', 'admin'], sort_order: 20, is_active: true,
    created_at: now(), updated_at: now(),
  },
  {
    id: 3, slug: 'hr', name: 'HR Self Service',
    description: 'ลางาน ขอเอกสาร ตรวจสอบสวัสดิการและสลิปเงินเดือน',
    category: 'บุคคล', network: 'internet',
    url: 'https://hr.example.com', sso_url: null, health_url: null,
    icon: '🧑‍💼', accent: 'violet', open_in_new_tab: true,
    allowed_roles: ['user', 'admin'], sort_order: 30, is_active: true,
    created_at: now(), updated_at: now(),
  },
  {
    id: 4, slug: 'wms', name: 'คลังสินค้า (WMS)',
    description: 'ระบบบริหารคลังสินค้าและการรับ-จ่ายสต๊อก',
    category: 'ระบบงานหลัก', network: 'intranet',
    url: 'https://wms.example.local/', sso_url: null,
    health_url: 'https://wms.example.local/ping.php',
    icon: '📦', accent: 'amber', open_in_new_tab: false,
    allowed_roles: ['user', 'admin'], sort_order: 40, is_active: true,
    created_at: now(), updated_at: now(),
  },
  {
    id: 5, slug: 'admin-console', name: 'Admin Console',
    description: 'จัดการผู้ใช้และสิทธิ์การเข้าถึงระบบ (เฉพาะผู้ดูแลระบบ)',
    category: 'ผู้ดูแลระบบ', network: 'internet',
    url: 'https://admin.example.com', sso_url: null, health_url: null,
    icon: '🛡️', accent: 'rose', open_in_new_tab: true,
    allowed_roles: ['admin'], sort_order: 90, is_active: true,
    created_at: now(), updated_at: now(),
  },
]

const seedAnnouncements: Announcement[] = [
  {
    id: 1,
    title: 'แจ้งปรับปรุงระบบ VPN ประจำเดือน',
    content:
      'ฝ่าย IT จะทำการอัปเดตเซิร์ฟเวอร์ VPN ในวันศุกร์นี้ เวลา 22:00 - 24:00 น.\n\n' +
      'ระหว่างช่วงเวลาดังกล่าว พนักงานจะไม่สามารถเข้าใช้งานระบบ Intranet (ERP, WMS) ได้ชั่วคราว ' +
      'ส่วนระบบบนคลาวด์ยังใช้งานได้ตามปกติ\n\nหากมีข้อสงสัยกรุณาติดต่อ IT Helpdesk ต่อ 1234',
    category: 'IT Alert', is_pinned: true, published: true,
    published_at: now(), author_id: null, created_at: now(), updated_at: now(),
  },
  {
    id: 2,
    title: 'สิทธิประโยชน์ประกันสุขภาพประจำปี 2026',
    content:
      'พนักงานสามารถดาวน์โหลดเอกสารคู่มือการเบิกจ่ายค่ารักษาพยาบาลฉบับใหม่ได้ที่ระบบ HR Self Service\n\n' +
      'วงเงินความคุ้มครองปรับเพิ่มขึ้นจากปีก่อน กรุณาตรวจสอบรายละเอียดและยืนยันข้อมูลผู้รับผลประโยชน์ ' +
      'ภายในวันที่ 30 กันยายน 2569',
    category: 'HR', is_pinned: false, published: true,
    published_at: now(), author_id: null, created_at: now(), updated_at: now(),
  },
  {
    id: 3,
    title: 'เปิดใช้งานระบบล็อกอินกลาง (SSO) แล้ววันนี้',
    content:
      'ตั้งแต่วันนี้เป็นต้นไป พนักงานสามารถใช้อีเมลบริษัทเพียงชุดเดียวในการเข้าถึงทุกระบบ ' +
      'ทั้งระบบบนคลาวด์และระบบภายในองค์กร\n\n' +
      'ไม่ต้องจำรหัสผ่านหลายชุดอีกต่อไป และเมื่อเข้าสู่ระบบครั้งแรกแล้ว การเปิดระบบอื่นจะไม่ถามรหัสผ่านซ้ำ',
    category: 'Announcement', is_pinned: false, published: true,
    published_at: now(), author_id: null, created_at: now(), updated_at: now(),
  },
]

export const demoStore = {
  listApps(): AppEntry[] {
    const apps = read<AppEntry[]>(KEY_APPS, seedApps)
    if (!localStorage.getItem(KEY_APPS)) write(KEY_APPS, apps)
    return [...apps].sort((a, b) => a.sort_order - b.sort_order || a.name.localeCompare(b.name, 'th'))
  },

  createApp(input: AppInput): AppEntry {
    const apps = demoStore.listApps()
    const entry: AppEntry = {
      ...input,
      id: apps.reduce((max, a) => Math.max(max, a.id), 0) + 1,
      created_at: now(),
      updated_at: now(),
    }
    write(KEY_APPS, [...apps, entry])
    return entry
  },

  updateApp(id: number, input: AppInput): AppEntry {
    const apps = demoStore.listApps()
    const next = apps.map((a) => (a.id === id ? { ...a, ...input, updated_at: now() } : a))
    write(KEY_APPS, next)
    const found = next.find((a) => a.id === id)
    if (!found) throw new Error('ไม่พบแอปที่ต้องการแก้ไข')
    return found
  },

  deleteApp(id: number): void {
    write(KEY_APPS, demoStore.listApps().filter((a) => a.id !== id))
  },

  listAnnouncements(): Announcement[] {
    const items = read<Announcement[]>(KEY_ANN, seedAnnouncements)
    if (!localStorage.getItem(KEY_ANN)) write(KEY_ANN, items)
    return [...items].sort(
      (a, b) =>
        Number(b.is_pinned) - Number(a.is_pinned) ||
        +new Date(b.published_at) - +new Date(a.published_at),
    )
  },

  reset(): void {
    localStorage.removeItem(KEY_APPS)
    localStorage.removeItem(KEY_ANN)
  },
}
