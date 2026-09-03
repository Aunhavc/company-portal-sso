import { describe, it, expect } from 'vitest'
import {
  ANNOUNCEMENT_CATEGORIES,
  draftCount,
  sortAnnouncements,
  validateAnnouncement,
} from '../announcements'
import type { Announcement } from '../types'

const a = (over: Partial<Announcement> & { id: number }): Announcement => ({
  title: `ประกาศ ${over.id}`,
  content: 'เนื้อหา',
  category: 'General',
  is_pinned: false,
  published: true,
  published_at: '2026-09-01T00:00:00Z',
  author_id: null,
  created_at: '2026-09-01T00:00:00Z',
  updated_at: '2026-09-01T00:00:00Z',
  ...over,
})

describe('validateAnnouncement', () => {
  it('บังคับหัวข้อ', () => {
    expect(validateAnnouncement({ title: '', content: 'x' }).title).toBeDefined()
    expect(validateAnnouncement({ title: '   ', content: 'x' }).title).toBeDefined()
  })

  it('บังคับเนื้อหา', () => {
    expect(validateAnnouncement({ title: 'x', content: '' }).content).toBeDefined()
    expect(validateAnnouncement({ title: 'x', content: '   ' }).content).toBeDefined()
  })

  it('ผ่านเมื่อกรอกครบ', () => {
    expect(validateAnnouncement({ title: 'หัวข้อ', content: 'เนื้อหา' })).toEqual({})
  })

  it('จับหัวข้อยาวเกิน 120 ตัวอักษร', () => {
    expect(validateAnnouncement({ title: 'ก'.repeat(121), content: 'x' }).title).toBeDefined()
    expect(validateAnnouncement({ title: 'ก'.repeat(120), content: 'x' }).title).toBeUndefined()
  })

  it('จับเนื้อหายาวเกิน 4000 ตัวอักษร', () => {
    expect(validateAnnouncement({ title: 'x', content: 'ก'.repeat(4001) }).content).toBeDefined()
    expect(validateAnnouncement({ title: 'x', content: 'ก'.repeat(4000) }).content).toBeUndefined()
  })

  it('ตัดช่องว่างหัวท้ายก่อนตรวจ', () => {
    expect(validateAnnouncement({ title: '   x   ', content: '   y   ' })).toEqual({})
  })
})

describe('sortAnnouncements', () => {
  it('ปักหมุดขึ้นก่อนเสมอ ไม่ว่าจะเก่ากว่า', () => {
    const list = [
      a({ id: 1, is_pinned: false, published_at: '2026-09-03T00:00:00Z' }),
      a({ id: 2, is_pinned: true, published_at: '2026-09-01T00:00:00Z' }),
    ]
    expect(sortAnnouncements(list).map((x) => x.id)).toEqual([2, 1])
  })

  it('ในกลุ่มเดียวกันเรียงใหม่สุดก่อน', () => {
    const list = [
      a({ id: 1, published_at: '2026-09-01T00:00:00Z' }),
      a({ id: 2, published_at: '2026-09-03T00:00:00Z' }),
    ]
    expect(sortAnnouncements(list).map((x) => x.id)).toEqual([2, 1])
  })

  it('ไม่แก้ไขอาร์เรย์ต้นฉบับ', () => {
    const list = [a({ id: 1 }), a({ id: 2, is_pinned: true })]
    const before = list.map((x) => x.id)
    sortAnnouncements(list)
    expect(list.map((x) => x.id)).toEqual(before)
  })
})

describe('draftCount', () => {
  it('นับเฉพาะที่ยังไม่เผยแพร่', () => {
    expect(
      draftCount([
        a({ id: 1, published: true }),
        a({ id: 2, published: false }),
        a({ id: 3, published: false }),
      ]),
    ).toBe(2)
  })

  it('ไม่มีฉบับร่าง = 0', () => {
    expect(draftCount([a({ id: 1 })])).toBe(0)
    expect(draftCount([])).toBe(0)
  })
})

describe('ANNOUNCEMENT_CATEGORIES', () => {
  it('มีครบ 4 หมวดหมู่ ไม่ซ้ำ', () => {
    expect(ANNOUNCEMENT_CATEGORIES.length).toBe(4)
    expect(new Set(ANNOUNCEMENT_CATEGORIES).size).toBe(4)
  })
})
