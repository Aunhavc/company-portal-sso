/**
 * ชั้นเข้าถึงข้อมูล — สลับระหว่าง Supabase จริง กับคลังข้อมูลจำลองอัตโนมัติ
 * ทุกคอมโพเนนต์เรียกผ่านไฟล์นี้เท่านั้น ทำให้ UI ไม่ต้องรู้ว่าอยู่โหมดไหน
 */
import { isLive } from './env'
import { requireSupabase } from './supabase'
import { demoProfile, demoStore } from './demoStore'
import type { Announcement, AppEntry, AppInput, Profile } from './types'

/** เลือกทุกคอลัมน์ — โครงสร้างตาราง apps ตรงกับ AppEntry แบบหนึ่งต่อหนึ่ง */
const APP_COLUMNS = '*'

function fail(context: string, error: { message: string } | null): never {
  throw new Error(`${context}: ${error?.message ?? 'unknown error'}`)
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
    if (!isLive) return demoStore.listApps()
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
}
