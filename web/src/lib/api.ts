/**
 * ชั้นเข้าถึงข้อมูล — สลับระหว่าง Supabase จริง กับคลังข้อมูลจำลองอัตโนมัติ
 * ทุกคอมโพเนนต์เรียกผ่านไฟล์นี้เท่านั้น ทำให้ UI ไม่ต้องรู้ว่าอยู่โหมดไหน
 */
import { isLive } from './env'
import { requireSupabase } from './supabase'
import { demoProfile, demoStore } from './demoStore'
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

/** เลือกทุกคอลัมน์ — โครงสร้างตาราง apps ตรงกับ AppEntry แบบหนึ่งต่อหนึ่ง */
const APP_COLUMNS = '*'

function fail(context: string, error: { message: string } | null): never {
  throw new Error(`${context}: ${error?.message ?? 'unknown error'}`)
}

/**
 * ลบหมวดหมู่ที่ยังมีประกาศอ้างอิงอยู่ — Postgres บล็อกด้วย foreign key (รหัส 23503)
 * แปลเป็นข้อความไทยที่บอกทางแก้ แทนข้อความ error ดิบของฐานข้อมูล
 */
function failDeleteCategory(error: { message: string; code?: string } | null): never {
  if (error?.code === '23503') {
    throw new Error('ลบไม่ได้ — ยังมีประกาศที่ใช้หมวดหมู่นี้อยู่ ย้ายประกาศไปหมวดอื่นก่อนแล้วค่อยลบ')
  }
  fail('ลบหมวดหมู่ไม่สำเร็จ', error)
}

export const api = {
  isLive,

  /** สร้าง/อัปเดตโปรไฟล์จาก JWT — ฝั่งเซิร์ฟเวอร์อ่าน sub/email เอง ไม่เชื่อ client */
  async syncProfile(fullName?: string | null, avatarUrl?: string | null): Promise<Profile> {
    if (!isLive) return demoProfile
    const { data, error } = await requireSupabase().rpc('sync_profile', {
      p_full_name: fullName ?? null,
      p_avatar_url: avatarUrl ?? null,
    })
    if (error) fail('ซิงค์โปรไฟล์ไม่สำเร็จ', error)
    return data as unknown as Profile
  },

  async listApps(): Promise<AppEntry[]> {
    if (!isLive) return demoStore.listApps()
    const { data, error } = await requireSupabase()
      .from('apps')
      .select(APP_COLUMNS)
      .eq('is_active', true)
      .order('sort_order', { ascending: true })
      .order('name', { ascending: true })
    if (error) fail('โหลดรายการแอปไม่สำเร็จ', error)
    return (data ?? []) as unknown as AppEntry[]
  },

  /** สำหรับหน้า Admin — เห็นแอปที่ปิดใช้งานด้วย */
  async listAllApps(): Promise<AppEntry[]> {
    if (!isLive) return demoStore.listAllApps()
    const { data, error } = await requireSupabase()
      .from('apps')
      .select(APP_COLUMNS)
      .order('sort_order', { ascending: true })
      .order('name', { ascending: true })
    if (error) fail('โหลดรายการแอปไม่สำเร็จ', error)
    return (data ?? []) as unknown as AppEntry[]
  },

  async createApp(input: AppInput): Promise<AppEntry> {
    if (!isLive) return demoStore.createApp(input)
    const { data, error } = await requireSupabase()
      .from('apps')
      .insert(input)
      .select(APP_COLUMNS)
      .single()
    if (error) fail('เพิ่มแอปไม่สำเร็จ', error)
    return data as unknown as AppEntry
  },

  async updateApp(id: number, input: AppInput): Promise<AppEntry> {
    if (!isLive) return demoStore.updateApp(id, input)
    const { data, error } = await requireSupabase()
      .from('apps')
      .update(input)
      .eq('id', id)
      .select(APP_COLUMNS)
      .single()
    if (error) fail('แก้ไขแอปไม่สำเร็จ', error)
    return data as unknown as AppEntry
  },

  async deleteApp(id: number): Promise<void> {
    if (!isLive) return demoStore.deleteApp(id)
    const { error } = await requireSupabase().from('apps').delete().eq('id', id)
    if (error) fail('ลบแอปไม่สำเร็จ', error)
  },

  async listAnnouncements(): Promise<Announcement[]> {
    if (!isLive) return demoStore.listAnnouncements()
    const { data, error } = await requireSupabase()
      .from('announcements')
      .select('*')
      .eq('published', true)
      .order('is_pinned', { ascending: false })
      .order('published_at', { ascending: false })
      .limit(20)
    if (error) fail('โหลดประกาศไม่สำเร็จ', error)
    return (data ?? []) as unknown as Announcement[]
  },

  /** ทุกรายการรวมที่ไม่เผยแพร่ — ใช้กับหน้าจัดการประกาศ */
  async listAllAnnouncements(): Promise<Announcement[]> {
    if (!isLive) return demoStore.listAllAnnouncements()
    const { data, error } = await requireSupabase()
      .from('announcements')
      .select('*')
      .order('is_pinned', { ascending: false })
      .order('published_at', { ascending: false })
    if (error) fail('โหลดรายการประกาศไม่สำเร็จ', error)
    return (data ?? []) as unknown as Announcement[]
  },

  async createAnnouncement(input: AnnouncementInput): Promise<Announcement> {
    if (!isLive) return demoStore.createAnnouncement(input)
    const { data, error } = await requireSupabase()
      .from('announcements')
      .insert(input)
      .select('*')
      .single()
    if (error) fail('เพิ่มประกาศไม่สำเร็จ', error)
    return data as unknown as Announcement
  },

  async updateAnnouncement(id: number, input: AnnouncementInput): Promise<Announcement> {
    if (!isLive) return demoStore.updateAnnouncement(id, input)
    const { data, error } = await requireSupabase()
      .from('announcements')
      .update(input)
      .eq('id', id)
      .select('*')
      .single()
    if (error) fail('บันทึกการแก้ไขประกาศไม่สำเร็จ', error)
    return data as unknown as Announcement
  },

  async deleteAnnouncement(id: number): Promise<void> {
    if (!isLive) return demoStore.deleteAnnouncement(id)
    const { error } = await requireSupabase().from('announcements').delete().eq('id', id)
    if (error) fail('ลบประกาศไม่สำเร็จ', error)
  },

  async listAnnouncementCategories(): Promise<AnnouncementCategoryEntry[]> {
    if (!isLive) return demoStore.listAnnouncementCategories()
    const { data, error } = await requireSupabase()
      .from('announcement_categories')
      .select('*')
      .order('sort_order', { ascending: true })
    if (error) fail('โหลดหมวดหมู่ประกาศไม่สำเร็จ', error)
    return (data ?? []) as unknown as AnnouncementCategoryEntry[]
  },

  /** key ถูกกำหนดครั้งเดียวตอนสร้าง ไม่ให้แก้ทีหลัง เพื่อไม่ให้ต้องตามแก้การอ้างอิงที่อื่น */
  async createAnnouncementCategory(
    key: string,
    input: AnnouncementCategoryInput,
  ): Promise<AnnouncementCategoryEntry> {
    if (!isLive) return demoStore.createAnnouncementCategory(key, input)
    const { data, error } = await requireSupabase()
      .from('announcement_categories')
      .insert({ key, ...input })
      .select('*')
      .single()
    if (error) fail('เพิ่มหมวดหมู่ไม่สำเร็จ', error)
    return data as unknown as AnnouncementCategoryEntry
  },

  async updateAnnouncementCategory(
    key: string,
    input: AnnouncementCategoryInput,
  ): Promise<AnnouncementCategoryEntry> {
    if (!isLive) return demoStore.updateAnnouncementCategory(key, input)
    const { data, error } = await requireSupabase()
      .from('announcement_categories')
      .update(input)
      .eq('key', key)
      .select('*')
      .single()
    if (error) fail('แก้ไขหมวดหมู่ไม่สำเร็จ', error)
    return data as unknown as AnnouncementCategoryEntry
  },

  async deleteAnnouncementCategory(key: string): Promise<void> {
    if (!isLive) return demoStore.deleteAnnouncementCategory(key)
    const { error } = await requireSupabase().from('announcement_categories').delete().eq('key', key)
    if (error) failDeleteCategory(error)
  },

  /** ค่าตั้งค่าองค์กร — อ่านได้โดยไม่ต้องล็อกอิน (หน้าล็อกอินใช้แสดงชื่อบริษัท) */
  async getSettings(): Promise<Settings> {
    if (!isLive) return demoStore.getSettings()
    const { data, error } = await requireSupabase().from('settings').select('key,value')
    if (error) fail('โหลดค่าตั้งค่าไม่สำเร็จ', error)
    const map = Object.fromEntries((data ?? []).map((r: any) => [r.key, r.value]))
    return {
      company_name: map.company_name ?? '',
      logo_url: map.logo_url ?? '',
      portal_tagline: map.portal_tagline ?? '',
      helpdesk_phone: map.helpdesk_phone ?? '',
      helpdesk_email: map.helpdesk_email ?? '',
    }
  },

  /** รายชื่อผู้ใช้ทั้งหมด — RLS อนุญาตเฉพาะผู้ดูแลระบบ */
  async listProfiles(): Promise<Profile[]> {
    if (!isLive) return demoStore.listProfiles()
    const { data, error } = await requireSupabase()
      .from('profiles')
      .select('*')
      .order('created_at', { ascending: false })
    if (error) fail('โหลดรายชื่อผู้ใช้ไม่สำเร็จ', error)
    return (data ?? []) as unknown as Profile[]
  },

  /** อนุมัติ / ระงับ / เปลี่ยนสิทธิ์ — ฝั่ง Postgres มี trigger กันการยกระดับตัวเองอยู่แล้ว */
  async updateProfile(id: string, change: { role?: UserRole; is_active?: boolean }): Promise<Profile> {
    if (!isLive) return demoStore.updateProfile(id, change)
    const { data, error } = await requireSupabase()
      .from('profiles')
      .update(change)
      .eq('id', id)
      .select('*')
      .single()
    if (error) fail('บันทึกข้อมูลผู้ใช้ไม่สำเร็จ', error)
    return data as unknown as Profile
  },

  async saveSettings(next: Settings): Promise<Settings> {
    if (!isLive) return demoStore.saveSettings(next)
    const rows = Object.entries(next).map(([key, value]) => ({ key, value: String(value ?? '') }))
    const { error } = await requireSupabase().from('settings').upsert(rows, { onConflict: 'key' })
    if (error) fail('บันทึกค่าตั้งค่าไม่สำเร็จ', error)
    return next
  },
}
