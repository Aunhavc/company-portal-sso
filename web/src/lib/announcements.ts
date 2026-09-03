import type { Announcement, AnnouncementCategory, AnnouncementInput } from './types'

/**
 * ตรรกะล้วนของประกาศ — แยกจาก React เพื่อให้ทดสอบได้โดยไม่ต้อง render
 */

export const ANNOUNCEMENT_CATEGORIES: AnnouncementCategory[] = [
  'Announcement',
  'IT Alert',
  'HR',
  'General',
]

const MAX_TITLE_LENGTH = 120
const MAX_CONTENT_LENGTH = 4000

export interface AnnouncementErrors {
  title?: string
  content?: string
}

/** ตรวจความถูกต้องของฟอร์ม — คืนข้อความ error รายช่อง (ว่าง = ผ่าน) */
export function validateAnnouncement(
  input: Pick<AnnouncementInput, 'title' | 'content'>,
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
