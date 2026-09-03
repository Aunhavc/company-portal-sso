/**
 * คลังข้อมูลจำลองสำหรับ "โหมดสาธิต"
 *
 * ใช้เมื่อยังไม่ได้ตั้งค่า Auth0/Supabase — เก็บลง localStorage
 * เพื่อให้ทดลองเพิ่ม/แก้/ลบแอปได้จริงก่อนต่อระบบหลังบ้าน
 * โครงสร้างข้อมูลเหมือนกับตารางบน Supabase ทุกฟิลด์
 */
import { categoryInUse, isVisibleNow } from './announcements'
import type {
  Announcement,
  AnnouncementCategoryEntry,
  AnnouncementCategoryInput,
  AnnouncementInput,
  AppEntry,
  AppInput,
  Profile,
  Settings,
  UserRole,
} from './types'

const KEY_APPS = 'portal.demo.apps.v1'
const KEY_ANN = 'portal.demo.announcements.v1'
const KEY_CAT = 'portal.demo.announcement_categories.v1'
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
    starts_at: null, ends_at: null,
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
    starts_at: null, ends_at: null,
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
    starts_at: null, ends_at: null,
    published_at: now(), author_id: null, created_at: now(), updated_at: now(),
  },
]

/** ตรงกับ 4 หมวดหมู่เริ่มต้นใน migration 0007 */
const seedCategories: AnnouncementCategoryEntry[] = [
  { key: 'Announcement', label: 'ประกาศ', color: 'blue', sort_order: 10, created_at: now(), updated_at: now() },
  { key: 'IT Alert', label: 'แจ้งเตือน IT', color: 'rose', sort_order: 20, created_at: now(), updated_at: now() },
  { key: 'HR', label: 'ฝ่ายบุคคล', color: 'violet', sort_order: 30, created_at: now(), updated_at: now() },
  { key: 'General', label: 'ทั่วไป', color: 'slate', sort_order: 40, created_at: now(), updated_at: now() },
]

const KEY_PROFILES = 'portal.demo.profiles'

const seedProfiles: Profile[] = [
  demoProfile,
  {
    id: 'google-oauth2|demo-pending',
    email: 'newcomer@example.com',
    full_name: 'พนักงานใหม่ รออนุมัติ',
    avatar_url: null,
    role: 'user',
    department: null,
    is_active: false,
    last_login_at: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
]

export const demoStore = {
  listProfiles(): Profile[] {
    const rows = read<Profile[]>(KEY_PROFILES, seedProfiles)
    if (!localStorage.getItem(KEY_PROFILES)) write(KEY_PROFILES, rows)
    return rows
  },

  updateProfile(id: string, change: { role?: UserRole; is_active?: boolean }): Profile {
    const rows = demoStore.listProfiles()
    const next = rows.map((p) => (p.id === id ? { ...p, ...change, updated_at: now() } : p))
    write(KEY_PROFILES, next)
    const found = next.find((p) => p.id === id)
    if (!found) throw new Error('ไม่พบผู้ใช้ที่ต้องการแก้ไข')
    return found
  },

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

  /** ทุกรายการรวมที่ไม่เผยแพร่ — ใช้กับหน้าจัดการประกาศ */
  listAllAnnouncements(): Announcement[] {
    const items = read<Announcement[]>(KEY_ANN, seedAnnouncements)
    if (!localStorage.getItem(KEY_ANN)) write(KEY_ANN, items)
    return [...items].sort(
      (a, b) =>
        Number(b.is_pinned) - Number(a.is_pinned) ||
        +new Date(b.published_at) - +new Date(a.published_at),
    )
  },

  /**
   * เฉพาะรายการที่เผยแพร่แล้วและอยู่ในกำหนดเวลา — ใช้กับหน้าหลักที่พนักงานเห็น
   * ให้ผลตรงกับฝั่ง Supabase ที่กรองด้วย RLS (announcements_select_published) จริง
   */
  listAnnouncements(): Announcement[] {
    return demoStore.listAllAnnouncements().filter((a) => isVisibleNow(a))
  },

  createAnnouncement(input: AnnouncementInput): Announcement {
    // ต้องอ่านรายการทั้งหมดก่อนเขียนกลับ มิฉะนั้นประกาศที่ยังไม่เผยแพร่จะหายไป
    const items = demoStore.listAllAnnouncements()
    const entry: Announcement = {
      ...input,
      id: items.reduce((max, a) => Math.max(max, a.id), 0) + 1,
      published_at: now(),
      author_id: null,
      created_at: now(),
      updated_at: now(),
    }
    write(KEY_ANN, [...items, entry])
    return entry
  },

  updateAnnouncement(id: number, input: AnnouncementInput): Announcement {
    const items = demoStore.listAllAnnouncements()
    const next = items.map((a) => (a.id === id ? { ...a, ...input, updated_at: now() } : a))
    write(KEY_ANN, next)
    const found = next.find((a) => a.id === id)
    if (!found) throw new Error('ไม่พบประกาศที่ต้องการแก้ไข')
    return found
  },

  deleteAnnouncement(id: number): void {
    write(KEY_ANN, demoStore.listAllAnnouncements().filter((a) => a.id !== id))
  },

  listAnnouncementCategories(): AnnouncementCategoryEntry[] {
    const items = read<AnnouncementCategoryEntry[]>(KEY_CAT, seedCategories)
    if (!localStorage.getItem(KEY_CAT)) write(KEY_CAT, items)
    return items
  },

  createAnnouncementCategory(
    key: string,
    input: AnnouncementCategoryInput,
  ): AnnouncementCategoryEntry {
    const items = demoStore.listAnnouncementCategories()
    if (items.some((c) => c.key === key)) {
      throw new Error(`มีหมวดหมู่รหัส "${key}" อยู่แล้ว`)
    }
    const entry: AnnouncementCategoryEntry = {
      key,
      ...input,
      created_at: now(),
      updated_at: now(),
    }
    write(KEY_CAT, [...items, entry])
    return entry
  },

  updateAnnouncementCategory(
    key: string,
    input: AnnouncementCategoryInput,
  ): AnnouncementCategoryEntry {
    const items = demoStore.listAnnouncementCategories()
    const next = items.map((c) => (c.key === key ? { ...c, ...input, updated_at: now() } : c))
    write(KEY_CAT, next)
    const found = next.find((c) => c.key === key)
    if (!found) throw new Error('ไม่พบหมวดหมู่ที่ต้องการแก้ไข')
    return found
  },

  /** จำลองพฤติกรรมเดียวกับ foreign key on delete restrict ฝั่ง Postgres */
  deleteAnnouncementCategory(key: string): void {
    if (categoryInUse(key, demoStore.listAllAnnouncements())) {
      throw new Error('ลบไม่ได้ — ยังมีประกาศที่ใช้หมวดหมู่นี้อยู่ ย้ายประกาศไปหมวดอื่นก่อนแล้วค่อยลบ')
    }
    write(KEY_CAT, demoStore.listAnnouncementCategories().filter((c) => c.key !== key))
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
