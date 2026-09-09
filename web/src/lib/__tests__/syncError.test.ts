import { describe, it, expect } from 'vitest'
import { syncErrorAdvice } from '../syncError'

/**
 * เกิดจริง 9 ก.ย. 2569: ผู้ใช้เข้าด้วยช่องทางที่ไม่ใช่ของตัวเอง แล้วติดค้างหน้า
 * "เชื่อมต่อฐานข้อมูลไม่สำเร็จ" ออกไปไหนไม่ได้เลย เพราะหน้านั้นไม่มีปุ่มออกจากระบบ
 * และข้อความที่ขึ้นเป็นเช็กลิสต์ของผู้ดูแลระบบซึ่งไม่เกี่ยวกับสาเหตุจริง
 */
describe('syncErrorAdvice — แยกแยะสาเหตุของ sync-error ให้ผู้ใช้ทำต่อได้', () => {
  const conflict =
    'ซิงค์โปรไฟล์ไม่สำเร็จ: อีเมล somjai.alert02@gmail.com ถูกใช้กับช่องทางเข้าสู่ระบบอื่นแล้ว กรุณาเข้าด้วยช่องทางเดิม หรือติดต่อ IT Helpdesk'

  it('อีเมลผูกกับอีกช่องทาง → บอกสาเหตุจริง ไม่ใช่เช็กลิสต์ของผู้ดูแล', () => {
    const a = syncErrorAdvice(conflict)
    expect(a.kind).toBe('identity-conflict')
    expect(a.title).toContain('ช่องทาง')
    expect(a.showSetupChecklist).toBe(false)
  })

  it('อีเมลผูกกับอีกช่องทาง → ต้องดึงอีเมลออกมาบอกผู้ใช้ด้วย', () => {
    expect(syncErrorAdvice(conflict).email).toBe('somjai.alert02@gmail.com')
  })

  it('นาฬิกาคลาดเคลื่อน → ไม่ใช่ปัญหาการตั้งค่า จึงไม่ต้องขึ้นเช็กลิสต์', () => {
    const a = syncErrorAdvice('JWT issued at future — token used before issued')
    expect(a.kind).toBe('clock-skew')
    expect(a.showSetupChecklist).toBe(false)
  })

  it('error อื่น → คงเช็กลิสต์การตั้งค่าไว้ตามเดิม', () => {
    const a = syncErrorAdvice('relation "public.profiles" does not exist')
    expect(a.kind).toBe('setup')
    expect(a.showSetupChecklist).toBe(true)
  })

  it('ไม่มีข้อความ error → ถือเป็นปัญหาการตั้งค่า ไม่พังและไม่โชว์ "null"', () => {
    const a = syncErrorAdvice(null)
    expect(a.kind).toBe('setup')
    expect(a.body).not.toContain('null')
  })

  it('ทุกกรณีต้องมีทางออกให้ผู้ใช้เสมอ — ห้ามค้างหน้าจอ', () => {
    for (const msg of [conflict, 'JWT issued at future', 'อะไรก็ไม่รู้', null]) {
      expect(syncErrorAdvice(msg).canLogout).toBe(true)
    }
  })
})
