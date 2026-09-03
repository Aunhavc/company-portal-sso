import { describe, it, expect, beforeEach } from 'vitest'
import { demoStore } from '../demoStore'
import type { AnnouncementCategoryInput, AnnouncementInput } from '../types'

const base: AnnouncementInput = {
  title: 'ประกาศทดสอบ',
  content: 'เนื้อหา',
  category: 'General',
  is_pinned: false,
  published: true,
  starts_at: null,
  ends_at: null,
}

beforeEach(() => localStorage.clear())

describe('demoStore ประกาศ', () => {
  // ด่านกันบั๊กเดียวกับที่เจอในหน้าจัดการแอป: listAnnouncements() เดิมไม่กรอง
  // published ทำให้ฉบับร่างหลุดไปแสดงบนหน้าหลักที่พนักงานเห็น
  it('listAnnouncements คืนเฉพาะที่เผยแพร่แล้ว', () => {
    demoStore.createAnnouncement({ ...base, title: 'เผยแพร่', published: true })
    demoStore.createAnnouncement({ ...base, title: 'ร่าง', published: false })
    const titles = demoStore.listAnnouncements().map((a) => a.title)
    expect(titles).toContain('เผยแพร่')
    expect(titles).not.toContain('ร่าง')
  })

  it('listAllAnnouncements คืนทั้งที่เผยแพร่และร่าง', () => {
    demoStore.createAnnouncement({ ...base, title: 'เผยแพร่', published: true })
    demoStore.createAnnouncement({ ...base, title: 'ร่าง', published: false })
    const titles = demoStore.listAllAnnouncements().map((a) => a.title)
    expect(titles).toContain('เผยแพร่')
    expect(titles).toContain('ร่าง')
  })

  // ด่านกันข้อมูลหาย: createAnnouncement เคยอ่านผ่าน listAnnouncements() (ที่กรองแล้ว)
  // แล้วเขียนทับ ทำให้ฉบับร่างเดิมหายไปทุกครั้งที่เพิ่มประกาศใหม่
  it('createAnnouncement ไม่ทำให้ฉบับร่างเดิมหายไป', () => {
    demoStore.createAnnouncement({ ...base, title: 'ร่างเดิม', published: false })
    const before = demoStore.listAllAnnouncements().length
    demoStore.createAnnouncement({ ...base, title: 'ใหม่', published: true })
    const after = demoStore.listAllAnnouncements()
    expect(after.length).toBe(before + 1)
    expect(after.map((a) => a.title)).toContain('ร่างเดิม')
  })

  it('updateAnnouncement ไม่ทำให้ฉบับร่างอื่นหายไป', () => {
    const draft = demoStore.createAnnouncement({ ...base, title: 'ร่างอื่น', published: false })
    const target = demoStore.createAnnouncement({ ...base, title: 'เป้าหมาย' })
    demoStore.updateAnnouncement(target.id, { ...base, title: 'แก้แล้ว' })
    const all = demoStore.listAllAnnouncements()
    expect(all.map((a) => a.id)).toContain(draft.id)
    expect(all.find((a) => a.id === target.id)?.title).toBe('แก้แล้ว')
  })

  it('deleteAnnouncement ลบเฉพาะรายการที่ระบุ', () => {
    const keep = demoStore.createAnnouncement({ ...base, title: 'เก็บไว้' })
    const drop = demoStore.createAnnouncement({ ...base, title: 'ลบทิ้ง' })
    demoStore.deleteAnnouncement(drop.id)
    const ids = demoStore.listAllAnnouncements().map((a) => a.id)
    expect(ids).toContain(keep.id)
    expect(ids).not.toContain(drop.id)
  })

  it('createAnnouncement ให้ id ไม่ซ้ำกันแม้เพิ่มติดกันหลายรายการ', () => {
    const ids = ['a', 'b', 'c'].map(
      (t) => demoStore.createAnnouncement({ ...base, title: t }).id,
    )
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('updateAnnouncement โยน error เมื่อไม่พบประกาศ', () => {
    expect(() => demoStore.updateAnnouncement(99999, base)).toThrow()
  })

  // ด่านกันบั๊กเดียวกับ published: listAnnouncements() ต้องกรองตามกำหนดเวลาด้วย
  // ให้ผลตรงกับ RLS policy announcements_select_published ฝั่ง Supabase จริง
  it('listAnnouncements ไม่แสดงประกาศที่ยังไม่ถึงวันเริ่ม', () => {
    const future = new Date(Date.now() + 86_400_000).toISOString()
    demoStore.createAnnouncement({ ...base, title: 'ยังไม่ถึงเวลา', starts_at: future })
    expect(demoStore.listAnnouncements().map((a) => a.title)).not.toContain('ยังไม่ถึงเวลา')
    expect(demoStore.listAllAnnouncements().map((a) => a.title)).toContain('ยังไม่ถึงเวลา')
  })

  it('listAnnouncements ไม่แสดงประกาศที่พ้นวันสิ้นสุดแล้ว', () => {
    const past = new Date(Date.now() - 86_400_000).toISOString()
    demoStore.createAnnouncement({ ...base, title: 'หมดอายุแล้ว', ends_at: past })
    expect(demoStore.listAnnouncements().map((a) => a.title)).not.toContain('หมดอายุแล้ว')
    expect(demoStore.listAllAnnouncements().map((a) => a.title)).toContain('หมดอายุแล้ว')
  })

  it('listAnnouncements แสดงประกาศที่อยู่ในช่วงเวลาปกติ', () => {
    const past = new Date(Date.now() - 86_400_000).toISOString()
    const future = new Date(Date.now() + 86_400_000).toISOString()
    demoStore.createAnnouncement({ ...base, title: 'กำลังแสดง', starts_at: past, ends_at: future })
    expect(demoStore.listAnnouncements().map((a) => a.title)).toContain('กำลังแสดง')
  })
})

describe('demoStore หมวดหมู่ประกาศ', () => {
  const catInput: AnnouncementCategoryInput = { label: 'ทดสอบ', color: 'blue', sort_order: 100 }

  it('มีหมวดหมู่เริ่มต้นครบ 4 รายการตรงกับ migration 0007', () => {
    const keys = demoStore.listAnnouncementCategories().map((c) => c.key)
    expect(keys.sort()).toEqual(['Announcement', 'General', 'HR', 'IT Alert'].sort())
  })

  it('createAnnouncementCategory เพิ่มหมวดหมู่ใหม่ได้', () => {
    demoStore.createAnnouncementCategory('custom', catInput)
    expect(demoStore.listAnnouncementCategories().map((c) => c.key)).toContain('custom')
  })

  it('createAnnouncementCategory ปฏิเสธ key ที่ซ้ำ', () => {
    demoStore.createAnnouncementCategory('custom', catInput)
    expect(() => demoStore.createAnnouncementCategory('custom', catInput)).toThrow()
  })

  it('updateAnnouncementCategory แก้ label/color ได้โดยไม่กระทบ key', () => {
    demoStore.createAnnouncementCategory('custom', catInput)
    const updated = demoStore.updateAnnouncementCategory('custom', {
      label: 'เปลี่ยนชื่อแล้ว',
      color: 'rose',
      sort_order: 5,
    })
    expect(updated.key).toBe('custom')
    expect(updated.label).toBe('เปลี่ยนชื่อแล้ว')
    expect(updated.color).toBe('rose')
  })

  // ด่านสำคัญที่สุดของฟีเจอร์นี้: ลบหมวดหมู่ที่มีประกาศอ้างอิงอยู่ไม่ได้
  // จำลองพฤติกรรมเดียวกับ foreign key on delete restrict ฝั่ง Postgres จริง
  it('deleteAnnouncementCategory ลบไม่ได้ถ้ายังมีประกาศใช้อยู่', () => {
    demoStore.createAnnouncementCategory('custom', catInput)
    demoStore.createAnnouncement({ ...base, category: 'custom' })
    expect(() => demoStore.deleteAnnouncementCategory('custom')).toThrow()
    expect(demoStore.listAnnouncementCategories().map((c) => c.key)).toContain('custom')
  })

  it('deleteAnnouncementCategory ลบได้ปกติเมื่อไม่มีประกาศใช้', () => {
    demoStore.createAnnouncementCategory('unused', catInput)
    demoStore.deleteAnnouncementCategory('unused')
    expect(demoStore.listAnnouncementCategories().map((c) => c.key)).not.toContain('unused')
  })
})
