import type {
  Announcement,
  AnnouncementCategoryEntry,
  AnnouncementCategoryInput,
  AnnouncementInput,
} from './types'

/**
 * ตรรกะล้วนของประกาศและหมวดหมู่ — แยกจาก React เพื่อให้ทดสอบได้โดยไม่ต้อง render
 */

const MAX_TITLE_LENGTH = 120
const MAX_CONTENT_LENGTH = 4000
const MAX_LABEL_LENGTH = 40

export interface AnnouncementErrors {
  title?: string
  content?: string
  category?: string
  ends_at?: string
}

/** ตรวจความถูกต้องของฟอร์มประกาศ — คืนข้อความ error รายช่อง (ว่าง = ผ่าน) */
export function validateAnnouncement(
  input: Pick<AnnouncementInput, 'title' | 'content' | 'category' | 'starts_at' | 'ends_at'>,
): AnnouncementErrors {
  const errors: AnnouncementErrors = {}
  const title = input.title.trim()
  const content = input.content.trim()

  if (!title) {
    errors.title = 'กรุณากรอกหัวข้อ'
  } else if (title.length > MAX_TITLE_LENGTH) {
    errors.title = `หัวข้อยาวเกินไป (สูงสุด ${MAX_TITLE_LENGTH} ตัวอักษร)`
  }

  if (!content) {
    errors.content = 'กรุณากรอกเนื้อหา'
  } else if (content.length > MAX_CONTENT_LENGTH) {
    errors.content = `เนื้อหายาวเกินไป (สูงสุด ${MAX_CONTENT_LENGTH} ตัวอักษร)`
  }

  if (!input.category.trim()) {
    errors.category = 'กรุณาเลือกหมวดหมู่'
  }

  if (input.starts_at && input.ends_at) {
    const starts = new Date(input.starts_at).getTime()
    const ends = new Date(input.ends_at).getTime()
    if (Number.isFinite(starts) && Number.isFinite(ends) && ends <= starts) {
      errors.ends_at = 'วันสิ้นสุดต้องอยู่หลังวันเริ่มต้น'
    }
  }

  return errors
}

/** เรียงเหมือนหน้าประกาศจริงที่พนักงานเห็น — ปักหมุดก่อน แล้วใหม่สุดก่อน */
export function sortAnnouncements(list: Announcement[]): Announcement[] {
  return [...list].sort((a, b) => {
    if (a.is_pinned !== b.is_pinned) return a.is_pinned ? -1 : 1
    return b.published_at.localeCompare(a.published_at)
  })
}

/** จำนวนประกาศที่ยังไม่เผยแพร่ (ฉบับร่าง) — ใช้แสดงป้ายแจ้งเตือน */
export function draftCount(list: Announcement[]): number {
  return list.filter((a) => !a.published).length
}

export type AnnouncementStatus = 'draft' | 'scheduled' | 'active' | 'expired'

/**
 * สถานะการแสดงผลจริงของประกาศ ณ เวลาหนึ่ง ๆ
 * ตรงกับเงื่อนไขใน RLS (announcements_select_published) ทุกจุด — ถ้าแก้ที่นี่
 * ต้องแก้ที่ migration 0007 ให้ตรงกันด้วย
 */
export function announcementStatus(
  item: Pick<Announcement, 'published' | 'starts_at' | 'ends_at'>,
  now: Date = new Date(),
): AnnouncementStatus {
  if (!item.published) return 'draft'
  if (item.starts_at && new Date(item.starts_at) > now) return 'scheduled'
  if (item.ends_at && new Date(item.ends_at) <= now) return 'expired'
  return 'active'
}

export const ANNOUNCEMENT_STATUS_LABEL: Record<AnnouncementStatus, string> = {
  draft: 'ฉบับร่าง',
  scheduled: 'ยังไม่ถึงกำหนด',
  active: 'กำลังแสดงอยู่',
  expired: 'หมดอายุแล้ว',
}

/** true = ประกาศนี้ควรแสดงบนหน้าหลัก ณ เวลาที่ระบุ — ใช้คู่กับโหมดสาธิตที่ไม่มี RLS จริง */
export function isVisibleNow(
  item: Pick<Announcement, 'published' | 'starts_at' | 'ends_at'>,
  now: Date = new Date(),
): boolean {
  return announcementStatus(item, now) === 'active'
}

/** แปลง ISO string เป็นค่าที่ <input type="datetime-local"> ใช้ได้ (เวลาท้องถิ่น) */
export function toLocalInputValue(iso: string | null): string {
  if (!iso) return ''
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

/** แปลงค่าจาก <input type="datetime-local"> กลับเป็น ISO string เก็บลง DB */
export function fromLocalInputValue(value: string): string | null {
  if (!value) return null
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return null
  return d.toISOString()
}

// -----------------------------------------------------------------------------
// หมวดหมู่
// -----------------------------------------------------------------------------

/** สร้างสารบัญค้นหาเร็ว key → หมวดหมู่ */
export function categoryMap(
  categories: AnnouncementCategoryEntry[],
): Record<string, AnnouncementCategoryEntry> {
  return Object.fromEntries(categories.map((c) => [c.key, c]))
}

export function sortCategories(list: AnnouncementCategoryEntry[]): AnnouncementCategoryEntry[] {
  return [...list].sort(
    (a, b) => a.sort_order - b.sort_order || a.label.localeCompare(b.label, 'th'),
  )
}

/** ตัดอักขระที่ไม่ใช่ a-z 0-9 ขีดกลาง — เหมือน slug ของแอป */
function slugify(label: string): string {
  return label
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, ' ')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 40)
}

/**
 * สร้างรหัสหมวดหมู่ใหม่จากชื่อที่กรอก — รับประกันไม่ซ้ำกับที่มีอยู่แล้ว
 * ชื่อภาษาไทยล้วนไม่มีอักษรละตินให้ใช้ทำ slug ได้ จึงมีค่าสำรอง 'cat'
 */
export function deriveCategoryKey(label: string, existingKeys: string[]): string {
  const base = slugify(label) || 'cat'
  const used = new Set(existingKeys)
  if (!used.has(base)) return base
  let n = 2
  while (used.has(`${base}-${n}`)) n += 1
  return `${base}-${n}`
}

export interface CategoryErrors {
  label?: string
}

/** ตรวจความถูกต้องของฟอร์มหมวดหมู่ */
export function validateCategory(
  input: Pick<AnnouncementCategoryInput, 'label'>,
): CategoryErrors {
  const errors: CategoryErrors = {}
  const label = input.label.trim()
  if (!label) {
    errors.label = 'กรุณากรอกชื่อหมวดหมู่'
  } else if (label.length > MAX_LABEL_LENGTH) {
    errors.label = `ชื่อยาวเกินไป (สูงสุด ${MAX_LABEL_LENGTH} ตัวอักษร)`
  }
  return errors
}

/** รายชื่อหมวดหมู่ที่มีประกาศอ้างอิงอยู่ — ใช้เตือนก่อนลบ (ฐานข้อมูลบล็อกอยู่แล้ว แต่ข้อความนี้อ่านง่ายกว่า) */
export function categoryInUse(key: string, announcements: Announcement[]): boolean {
  return announcements.some((a) => a.category === key)
}
