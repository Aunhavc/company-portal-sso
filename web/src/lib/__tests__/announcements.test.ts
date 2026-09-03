import { describe, it, expect } from 'vitest'
import {
  announcementStatus,
  categoryInUse,
  categoryMap,
  deriveCategoryKey,
  draftCount,
  fromLocalInputValue,
  isVisibleNow,
  sortAnnouncements,
  sortCategories,
  toLocalInputValue,
  validateAnnouncement,
  validateCategory,
} from '../announcements'
import type { Announcement, AnnouncementCategoryEntry } from '../types'

const a = (over: Partial<Announcement> & { id: number }): Announcement => ({
  title: `ประกาศ ${over.id}`,
  content: 'เนื้อหา',
  category: 'General',
  is_pinned: false,
  published: true,
  starts_at: null,
  ends_at: null,
  published_at: '2026-09-01T00:00:00Z',
  author_id: null,
  created_at: '2026-09-01T00:00:00Z',
  updated_at: '2026-09-01T00:00:00Z',
  ...over,
})

const baseInput = { title: 'หัวข้อ', content: 'เนื้อหา', category: 'General', starts_at: null, ends_at: null }

describe('validateAnnouncement', () => {
  it('บังคับหัวข้อ', () => {
    expect(validateAnnouncement({ ...baseInput, title: '' }).title).toBeDefined()
    expect(validateAnnouncement({ ...baseInput, title: '   ' }).title).toBeDefined()
  })

  it('บังคับเนื้อหา', () => {
    expect(validateAnnouncement({ ...baseInput, content: '' }).content).toBeDefined()
    expect(validateAnnouncement({ ...baseInput, content: '   ' }).content).toBeDefined()
  })

  it('บังคับเลือกหมวดหมู่', () => {
    expect(validateAnnouncement({ ...baseInput, category: '' }).category).toBeDefined()
    expect(validateAnnouncement({ ...baseInput, category: '  ' }).category).toBeDefined()
  })

  it('ผ่านเมื่อกรอกครบ', () => {
    expect(validateAnnouncement(baseInput)).toEqual({})
  })

  it('จับหัวข้อยาวเกิน 120 ตัวอักษร', () => {
    expect(validateAnnouncement({ ...baseInput, title: 'ก'.repeat(121) }).title).toBeDefined()
    expect(validateAnnouncement({ ...baseInput, title: 'ก'.repeat(120) }).title).toBeUndefined()
  })

  it('จับเนื้อหายาวเกิน 4000 ตัวอักษร', () => {
    expect(validateAnnouncement({ ...baseInput, content: 'ก'.repeat(4001) }).content).toBeDefined()
    expect(validateAnnouncement({ ...baseInput, content: 'ก'.repeat(4000) }).content).toBeUndefined()
  })

  it('ตัดช่องว่างหัวท้ายก่อนตรวจ', () => {
    expect(validateAnnouncement({ ...baseInput, title: '   x   ', content: '   y   ' })).toEqual({})
  })

  it('จับวันสิ้นสุดที่มาก่อนวันเริ่มต้น', () => {
    const errors = validateAnnouncement({
      ...baseInput,
      starts_at: '2026-09-10T00:00:00Z',
      ends_at: '2026-09-01T00:00:00Z',
    })
    expect(errors.ends_at).toBeDefined()
  })

  it('จับวันสิ้นสุดที่เท่ากับวันเริ่มต้นด้วย (ต้องมากกว่า ไม่ใช่เท่ากัน)', () => {
    const errors = validateAnnouncement({
      ...baseInput,
      starts_at: '2026-09-10T00:00:00Z',
      ends_at: '2026-09-10T00:00:00Z',
    })
    expect(errors.ends_at).toBeDefined()
  })

  it('ผ่านเมื่อวันสิ้นสุดอยู่หลังวันเริ่มต้น', () => {
    const errors = validateAnnouncement({
      ...baseInput,
      starts_at: '2026-09-01T00:00:00Z',
      ends_at: '2026-09-10T00:00:00Z',
    })
    expect(errors.ends_at).toBeUndefined()
  })

  it('ไม่ตรวจช่วงเวลาถ้ามีแค่ค่าเดียว', () => {
    expect(validateAnnouncement({ ...baseInput, starts_at: '2026-09-10T00:00:00Z', ends_at: null }).ends_at).toBeUndefined()
    expect(validateAnnouncement({ ...baseInput, starts_at: null, ends_at: '2026-09-10T00:00:00Z' }).ends_at).toBeUndefined()
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

describe('announcementStatus / isVisibleNow — กำหนดเวลาแสดงผล', () => {
  const now = new Date('2026-09-15T12:00:00Z')

  it('ยังไม่เผยแพร่ = draft เสมอ ไม่ว่ากำหนดเวลาจะเป็นอย่างไร', () => {
    expect(announcementStatus({ published: false, starts_at: null, ends_at: null }, now)).toBe('draft')
    expect(
      announcementStatus(
        { published: false, starts_at: '2026-09-01T00:00:00Z', ends_at: null },
        now,
      ),
    ).toBe('draft')
  })

  it('เผยแพร่แล้วไม่มีกำหนดเวลา = active', () => {
    expect(announcementStatus({ published: true, starts_at: null, ends_at: null }, now)).toBe('active')
  })

  it('ยังไม่ถึงวันเริ่ม = scheduled', () => {
    const status = announcementStatus(
      { published: true, starts_at: '2026-09-20T00:00:00Z', ends_at: null },
      now,
    )
    expect(status).toBe('scheduled')
  })

  it('พ้นวันสิ้นสุดแล้ว = expired', () => {
    const status = announcementStatus(
      { published: true, starts_at: null, ends_at: '2026-09-10T00:00:00Z' },
      now,
    )
    expect(status).toBe('expired')
  })

  it('ends_at ตรงกับเวลาปัจจุบันเป๊ะ = expired แล้ว (ends_at คือขอบเขตแบบไม่รวม)', () => {
    const status = announcementStatus({ published: true, starts_at: null, ends_at: now.toISOString() }, now)
    expect(status).toBe('expired')
  })

  it('อยู่ในช่วง starts_at ถึง ends_at = active', () => {
    const status = announcementStatus(
      { published: true, starts_at: '2026-09-01T00:00:00Z', ends_at: '2026-09-30T00:00:00Z' },
      now,
    )
    expect(status).toBe('active')
  })

  // ด่านสำคัญ: isVisibleNow ต้องสอดคล้องกับ RLS policy announcements_select_published
  // ใน migration 0007 ทุกกรณี ไม่งั้นโหมดสาธิตกับของจริงจะแสดงผลไม่ตรงกัน
  it('isVisibleNow true เฉพาะกรณี active เท่านั้น', () => {
    expect(isVisibleNow({ published: true, starts_at: null, ends_at: null }, now)).toBe(true)
    expect(isVisibleNow({ published: false, starts_at: null, ends_at: null }, now)).toBe(false)
    expect(
      isVisibleNow({ published: true, starts_at: '2026-09-20T00:00:00Z', ends_at: null }, now),
    ).toBe(false)
    expect(
      isVisibleNow({ published: true, starts_at: null, ends_at: '2026-09-10T00:00:00Z' }, now),
    ).toBe(false)
  })
})

describe('toLocalInputValue / fromLocalInputValue — แปลงกลับไปกลับมาไม่เพี้ยน', () => {
  it('ค่าว่างไปกลับเป็นค่าว่าง', () => {
    expect(toLocalInputValue(null)).toBe('')
    expect(fromLocalInputValue('')).toBeNull()
  })

  it('แปลงไปกลับ (ISO → input → ISO) ได้ค่าเวลาเดิม', () => {
    const original = new Date('2026-09-15T09:30:00.000Z').toISOString()
    const roundTripped = fromLocalInputValue(toLocalInputValue(original))
    expect(new Date(roundTripped!).getTime()).toBe(new Date(original).getTime())
  })

  it('input ที่ไม่ใช่วันที่จริง คืนค่า null', () => {
    expect(fromLocalInputValue('not-a-date')).toBeNull()
  })
})

describe('หมวดหมู่', () => {
  const cat = (over: Partial<AnnouncementCategoryEntry> & { key: string }): AnnouncementCategoryEntry => ({
    label: over.key,
    color: 'slate',
    sort_order: 100,
    created_at: '2026-09-01T00:00:00Z',
    updated_at: '2026-09-01T00:00:00Z',
    ...over,
  })

  it('categoryMap สร้างสารบัญค้นหาด้วย key', () => {
    const map = categoryMap([cat({ key: 'a', label: 'A' }), cat({ key: 'b', label: 'B' })])
    expect(map.a.label).toBe('A')
    expect(map.b.label).toBe('B')
  })

  it('sortCategories เรียงตาม sort_order ก่อน', () => {
    const list = [cat({ key: 'b', sort_order: 20 }), cat({ key: 'a', sort_order: 10 })]
    expect(sortCategories(list).map((c) => c.key)).toEqual(['a', 'b'])
  })

  describe('deriveCategoryKey', () => {
    it('สร้างรหัสจากชื่อภาษาอังกฤษ', () => {
      expect(deriveCategoryKey('Sales Team', [])).toBe('sales-team')
    })

    it('ชื่อภาษาไทยล้วนไม่มีอักษรละติน ได้ค่าสำรอง cat', () => {
      expect(deriveCategoryKey('ฝ่ายผลิต', [])).toBe('cat')
    })

    it('กันรหัสซ้ำด้วยการต่อเลขท้าย', () => {
      expect(deriveCategoryKey('ฝ่ายผลิต', ['cat'])).toBe('cat-2')
      expect(deriveCategoryKey('ฝ่ายผลิต', ['cat', 'cat-2'])).toBe('cat-3')
    })

    it('ไม่ชนกับรหัสเดิมที่ตั้งชื่อเหมือนกันแบบอังกฤษ', () => {
      expect(deriveCategoryKey('IT Alert', ['it-alert'])).toBe('it-alert-2')
    })
  })

  describe('validateCategory', () => {
    it('บังคับชื่อหมวดหมู่', () => {
      expect(validateCategory({ label: '' }).label).toBeDefined()
      expect(validateCategory({ label: '   ' }).label).toBeDefined()
    })

    it('จับชื่อยาวเกิน 40 ตัวอักษร', () => {
      expect(validateCategory({ label: 'ก'.repeat(41) }).label).toBeDefined()
      expect(validateCategory({ label: 'ก'.repeat(40) }).label).toBeUndefined()
    })

    it('ผ่านเมื่อกรอกชื่อสั้น ๆ', () => {
      expect(validateCategory({ label: 'ทั่วไป' })).toEqual({})
    })
  })

  describe('categoryInUse', () => {
    it('true เมื่อมีประกาศอ้างอิงหมวดหมู่นั้นอยู่', () => {
      const list = [a({ id: 1, category: 'HR' })]
      expect(categoryInUse('HR', list)).toBe(true)
      expect(categoryInUse('General', list)).toBe(false)
    })

    it('false เมื่อไม่มีประกาศเลย', () => {
      expect(categoryInUse('HR', [])).toBe(false)
    })
  })
})
