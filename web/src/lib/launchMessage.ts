/**
 * ข้อความหน้า /launch เมื่อตรวจแล้ว "อยู่นอกเครือข่าย"
 *
 * ทำไมต้องแยกตามจำนวนครั้ง: ตอนแรกกดปุ่ม "ต่อ VPN แล้ว ตรวจสอบอีกครั้ง" แล้วผลยังไม่ผ่าน
 * หน้าไม่เปลี่ยนเลย ผู้ใช้เข้าใจว่าปุ่มพัง (ทดสอบ 7 ก.ย. 2569) — รอบที่สองขึ้นไป
 * ต้องบอกชัดว่า "ตรวจแล้ว ยังไม่พบ VPN" และถ้า IP ไม่ขยับก็บอกตรง ๆ
 */
export interface OutsideMessage {
  title: string
  body: string
  /** true = ผู้ใช้กดตรวจซ้ำแล้วอย่างน้อยหนึ่งครั้ง */
  retried: boolean
}

export function outsideMessage(attempts: number, ip: string | null, previousIp?: string | null): OutsideMessage {
  const ipText = ip ? ` (IP ของคุณ: ${ip})` : ''
  if (attempts <= 1) {
    return {
      title: 'คุณอยู่นอกเครือข่ายบริษัท — ต้องเชื่อมต่อ VPN ก่อนใช้งาน',
      body: `แอปนี้อยู่บนเครือข่ายภายใน (Intranet / LAN) เครื่องของคุณกำลังออกอินเทอร์เน็ตจากนอกสำนักงาน${ipText} กรุณาต่อ VPN ตามขั้นตอนด้านล่าง แล้วกดตรวจสอบอีกครั้ง`,
      retried: false,
    }
  }
  const sameIp = ip && previousIp && ip === previousIp ? ' IP ยังเป็นค่าเดิม แสดงว่าเครื่องยังไม่ได้ออกอินเทอร์เน็ตผ่านบริษัท' : ''
  return {
    title: 'ตรวจแล้ว ยังไม่พบการเชื่อมต่อ VPN — กรุณาตรวจสอบการเชื่อมต่อ VPN อีกครั้ง',
    body: `ตรวจแล้ว ${attempts} ครั้ง เครื่องของคุณยังออกอินเทอร์เน็ตจากนอกสำนักงาน${ipText}${sameIp} ตรวจสอบว่าโปรแกรม VPN ขึ้นสถานะ Connected แล้วกดตรวจสอบอีกครั้ง หากยังไม่ผ่าน ติดต่อ IT Helpdesk ด้านล่าง`,
    retried: true,
  }
}
