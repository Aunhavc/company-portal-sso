import { describe, it, expect, beforeEach } from 'vitest'
import { demoStore } from '../demoStore'
import type { AnnouncementInput } from '../types'

const base: AnnouncementInput = {
  title: 'ประกาศทดสอบ',
  content: 'เนื้อหา',
  category: 'General',
  is_pinned: false,
  published: true,
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
})
