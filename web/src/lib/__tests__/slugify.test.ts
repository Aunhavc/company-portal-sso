import { describe, it, expect } from 'vitest'
import { slugify } from '../../components/AppFormModal'

describe('slugify', () => {
  // ด่านกันบั๊กที่เคยเจอ: เดิมยอมให้อักขระไทยติดมาใน slug
  it('ตัดอักขระไทยออกทั้งหมด', () => {
    expect(slugify('ระบบคลังสินค้า')).toBe('')
    expect(slugify('ระบบคลังสินค้า (WMS)')).toBe('wms')
  })

  it('แปลงชื่ออังกฤษเป็นรหัสที่ใช้ได้', () => {
    expect(slugify('Neo POS')).toBe('neo-pos')
    expect(slugify('  Sales   Report  ')).toBe('sales-report')
  })

  it('ไม่มีขีดกลางซ้ำหรือขีดหัวท้าย', () => {
    const s = slugify('-- Hello --- World --')
    expect(s).toBe('hello-world')
    expect(s.startsWith('-')).toBe(false)
    expect(s.endsWith('-')).toBe(false)
    expect(s).not.toContain('--')
  })

  it('ผลลัพธ์มีแต่ a-z 0-9 และขีดกลางเท่านั้น', () => {
    for (const name of ['ERP 2026!', 'A@B#C', 'ระบบ HR ฝ่ายบุคคล', 'Ünïcödé Tëst']) {
      expect(slugify(name)).toMatch(/^[a-z0-9-]*$/)
    }
  })

  it('ยาวไม่เกิน 40 ตัวอักษร', () => {
    expect(slugify('a'.repeat(80)).length).toBeLessThanOrEqual(40)
  })

  it('รับสตริงว่างได้', () => {
    expect(slugify('')).toBe('')
    expect(slugify('   ')).toBe('')
  })
})
