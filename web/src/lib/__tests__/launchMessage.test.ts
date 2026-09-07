import { describe, it, expect } from 'vitest'
import { outsideMessage } from '../launchMessage'

describe('outsideMessage — ข้อความหน้า "อยู่นอกเครือข่าย" ตามจำนวนครั้งที่ตรวจ', () => {
  it('ตรวจครั้งแรก → บอกว่าอยู่นอกเครือข่าย ให้ต่อ VPN', () => {
    const m = outsideMessage(1, '49.230.220.172')
    expect(m.title).toBe('คุณอยู่นอกเครือข่ายบริษัท — ต้องเชื่อมต่อ VPN ก่อนใช้งาน')
    expect(m.body).toContain('49.230.220.172')
    expect(m.retried).toBe(false)
  })

  it('กดตรวจซ้ำแล้วยังไม่ผ่าน → หัวข้อเปลี่ยนเป็น "ยังไม่พบ VPN" ไม่ใช่ข้อความเดิมเงียบ ๆ', () => {
    const m = outsideMessage(2, '49.230.220.172')
    expect(m.retried).toBe(true)
    expect(m.title).toBe('ตรวจแล้ว ยังไม่พบการเชื่อมต่อ VPN — กรุณาตรวจสอบการเชื่อมต่อ VPN อีกครั้ง')
    expect(m.body).toContain('ตรวจแล้ว 2 ครั้ง')
    expect(m.body).toContain('49.230.220.172')
  })

  it('ตรวจซ้ำแล้ว IP ยังเป็นค่าเดิม → บอกตรง ๆ ว่า IP ไม่เปลี่ยน', () => {
    const m = outsideMessage(3, '49.230.220.172', '49.230.220.172')
    expect(m.body).toContain('IP ยังเป็นค่าเดิม')
  })

  it('ไม่รู้ IP → ไม่พังและไม่โชว์ "null"', () => {
    const m = outsideMessage(2, null)
    expect(m.body).not.toContain('null')
    expect(m.retried).toBe(true)
  })
})
