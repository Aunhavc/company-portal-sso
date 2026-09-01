/**
 * คลังข้อมูลจำลองสำหรับ "โหมดสาธิต"
 *
 * ใช้เมื่อยังไม่ได้ตั้งค่า Auth0/Supabase — เก็บลง localStorage
 * เพื่อให้ทดลองเพิ่ม/แก้/ลบแอปได้จริงก่อนต่อระบบหลังบ้าน
 * โครงสร้างข้อมูลเหมือนกับตารางบน Supabase ทุกฟิลด์
 */
import type { Announcement, AppEntry, AppInput, Profile, Settings } from './types'

const KEY_APPS = 'portal.demo.apps.v1'
const KEY_ANN = 'portal.demo.announcements.v1'
const KEY_SET = 'portal.demo.settings.v1'

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

/**
 * แอปตั้งต้น
 *
 * เปิดใช้งานเฉพาะแอปที่มี URL จริงและตรวจแล้วว่าเข้าถึงได้เท่านั้น
 * ส่วนที่เหลือเป็นร่างรอกำหนด URL — ปิดไว้ก่อนเพื่อไม่ให้พนักงานคลิกแล้วเจอหน้าเปล่า
 * เปิดใช้งานได้ที่หน้า "จัดการแอป" เมื่อกรอก URL จริงแล้ว
 */
const DRAFT_NOTE = ' — ยังไม่ได้กำหนด URL จริง แก้ที่หน้าจัดการแอปแล้วเปิดใช้งาน'

const seedApps: AppEntry[] = [
  {
    id: 1, slug: 'neopos-web', name: 'NeoPOS — หน้าจอขาย',
    description: 'ระบบขายหน้าร้านบนคลาวด์ ใช้งานได้จากทุกสาขาและทุกอุปกรณ์',
    category: 'ระบบงานหลัก', network: 'internet',
    url: 'https://neopos-web.vercel.app', sso_url: null, health_url: null,
    icon: '🛒', accent: 'blue', open_in_new_tab: true,
    allowed_roles: ['user', 'admin'], sort_order: 10, is_active: true,
    created_at: now(), updated_at: now(),
  },
  {
    id: 2, slug: 'sap-b1', name: 'SAP Business One',
    description: 'ระบบ ERP หลักขององค์กร ต้องเชื่อมต่อ VPN ก่อนใช้งาน' + DRAFT_NOTE,
    category: 'ระบบงานหลัก', network: 'intranet',
    url: 'https://sap.company.local/', sso_url: null,
    health_url: 'https://sap.company.local/ping.php',
    icon: '🏭', accent: 'emerald', open_in_new_tab: false,
    allowed_roles: ['user', 'admin'], sort_order: 20, is_active: false,
    created_at: now(), updated_at: now(),
  },
  {
    id: 3, slug: 'wms', name: 'WMS — คลังสินค้า',
    description: 'รับ-จ่ายสต๊อก ตรวจนับ และจัดการตำแหน่งเก็บ' + DRAFT_NOTE,
    category: 'ระบบงานหลัก', network: 'intranet',
    url: 'https://wms.company.local/',
    sso_url: 'https://wms.company.local/auth-callback.php',
    health_url: 'https://wms.company.local/ping.php',
    icon: '📦', accent: 'amber', open_in_new_tab: false,
    allowed_roles: ['user', 'admin'], sort_order: 30, is_active: false,
    created_at: now(), updated_at: now(),
  },
  {
    id: 4, slug: 'doctracking', name: 'DocTracking — ติดตามเอกสาร',
    description: 'ติดตามสถานะเอกสารและการอนุมัติภายในองค์กร' + DRAFT_NOTE,
    category: 'งานเอกสาร', network: 'intranet',
    url: 'https://doc.company.local/', sso_url: null,
    health_url: 'https://doc.company.local/ping.php',
    icon: '🧾', accent: 'cyan', open_in_new_tab: false,
    allowed_roles: ['user', 'admin'], sort_order: 40, is_active: false,
    created_at: now(), updated_at: now(),
  },
  {
    id: 5, slug: 'salestarget', name: 'SalesTarget — เป้าการขาย',
    description: 'กำหนดและติดตามเป้า Sales/GP รายกลุ่ม สาขา และเดือน' + DRAFT_NOTE,
    category: 'ขายและการตลาด', network: 'intranet',
    url: 'https://salestarget.company.local/', sso_url: null,
    health_url: 'https://salestarget.company.local/ping.php',
    icon: '📊', accent: 'violet', open_in_new_tab: false,
    allowed_roles: ['admin'], sort_order: 50, is_active: false,
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
  /** ทุกรายการรวมที่ปิดใช้งาน — ใช้กับหน้าจัดการแอป */
  listAllApps(): AppEntry[] {
    const apps = read<AppEntry[]>(KEY_APPS, seedApps)
    if (!localStorage.getItem(KEY_APPS)) write(KEY_APPS, apps)
    return [...apps].sort((a, b) => a.sort_order - b.sort_order || a.name.localeCompare(b.name, 'th'))
  },

  /**
   * เฉพาะรายการที่เปิดใช้งาน — ใช้กับหน้าหลักที่พนักงานเห็น
   * ให้ผลตรงกับฝั่ง Supabase ที่กรอง is_active ด้วย RLS
   */
  listApps(): AppEntry[] {
    return demoStore.listAllApps().filter((a) => a.is_active)
  },

  createApp(input: AppInput): AppEntry {
    // ต้องอ่านรายการทั้งหมดก่อนเขียนกลับ มิฉะนั้นแอปที่ปิดใช้งานอยู่จะหายไป
    const apps = demoStore.listAllApps()
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
    const apps = demoStore.listAllApps()
    const next = apps.map((a) => (a.id === id ? { ...a, ...input, updated_at: now() } : a))
    write(KEY_APPS, next)
    const found = next.find((a) => a.id === id)
    if (!found) throw new Error('ไม่พบแอปที่ต้องการแก้ไข')
    return found
  },

  deleteApp(id: number): void {
    write(KEY_APPS, demoStore.listAllApps().filter((a) => a.id !== id))
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

  getSettings(): Settings {
    return read<Settings>(KEY_SET, {
      company_name: 'บจก. สมใจบิสกรุ๊ป',
      logo_url: '',
      portal_tagline: 'ศูนย์รวมระบบงานพนักงาน',
      helpdesk_phone: '1234',
      helpdesk_email: 'helpdesk@company.com',
    })
  },

  saveSettings(next: Settings): Settings {
    write(KEY_SET, next)
    return next
  },

  reset(): void {
    localStorage.removeItem(KEY_APPS)
    localStorage.removeItem(KEY_ANN)
    localStorage.removeItem(KEY_SET)
  },
}
