/**
 * แยกแยะสาเหตุของ sync-error แล้วบอกผู้ใช้ให้ตรงเรื่อง
 *
 * ทำไมต้องมี (เกิดจริง 9 ก.ย. 2569): ผู้ใช้เข้าด้วยช่องทางที่ไม่ใช่ของตัวเอง
 * `sync_profile` โยน 23505 (HTTP 409) หน้าเว็บขึ้น "เชื่อมต่อฐานข้อมูลไม่สำเร็จ"
 * พร้อมเช็กลิสต์ของผู้ดูแลระบบซึ่งไม่เกี่ยวกับสาเหตุจริง และ**ไม่มีปุ่มออกจากระบบ**
 * ผู้ใช้จึงติดค้างหน้านั้น เข้าใหม่กี่ครั้งก็เจอหน้าเดิม เพราะโทเคนเดิมยังอยู่ใน localStorage
 *
 * กติกา: ทุกกรณีต้องมีทางออกเสมอ (`canLogout` เป็น true เสมอ)
 */
import { isClockSkewError } from './clockSkew'

export type SyncErrorKind = 'identity-conflict' | 'clock-skew' | 'setup'

export interface SyncErrorAdvice {
  kind: SyncErrorKind
  title: string
  body: string
  /** อีเมลที่ชน — ดึงจากข้อความของฐานข้อมูลเพื่อบอกผู้ใช้ให้ชัด */
  email: string | null
  /** เช็กลิสต์การตั้งค่าเป็นเรื่องของผู้ดูแล ไม่ควรขึ้นเมื่อรู้สาเหตุจริงแล้ว */
  showSetupChecklist: boolean
  /** ต้องมีปุ่มออกจากระบบทุกกรณี ห้ามให้ผู้ใช้ค้างหน้าจอ */
  canLogout: true
}

/** ข้อความนี้มาจาก sync_profile ใน supabase/migrations/0006_access_approval.sql */
const CONFLICT_RE = /ถูกใช้กับช่องทางเข้าสู่ระบบอื่น/
const EMAIL_RE = /[\w.+-]+@[\w-]+\.[\w.-]+/

export function syncErrorAdvice(message: string | null | undefined): SyncErrorAdvice {
  const text = (message ?? '').trim()

  if (CONFLICT_RE.test(text)) {
    const email = EMAIL_RE.exec(text)?.[0] ?? null
    return {
      kind: 'identity-conflict',
      title: 'อีเมลนี้ผูกกับช่องทางเข้าสู่ระบบอื่นอยู่แล้ว',
      body:
        (email ? `อีเมล ${email} ` : 'อีเมลนี้ ') +
        'เคยเข้าใช้งานพอร์ทัลด้วยช่องทางอื่นไว้ก่อนแล้ว ' +
        'กรุณาออกจากระบบแล้วเข้าใหม่ด้วยช่องทางเดิม — พนักงานที่มีบัญชีบริษัทให้กดปุ่ม ' +
        '“เข้าสู่ระบบด้วยบัญชีพนักงาน (AD)” หากไม่แน่ใจว่าเคยใช้ช่องทางไหน ติดต่อ IT Helpdesk',
      email,
      showSetupChecklist: false,
      canLogout: true,
    }
  }

  if (isClockSkewError({ message: text })) {
    return {
      kind: 'clock-skew',
      title: 'นาฬิกาของผู้ให้บริการคลาดเคลื่อนชั่วคราว',
      body:
        'ไม่ใช่ปัญหาการตั้งค่าและไม่ใช่ความผิดของบัญชีคุณ — ระบบลองซ้ำให้แล้วแต่ยังไม่ผ่าน ' +
        'กรุณารอสักครู่ แล้วออกจากระบบเพื่อเข้าใหม่อีกครั้ง',
      email: null,
      showSetupChecklist: false,
      canLogout: true,
    }
  }

  return {
    kind: 'setup',
    title: 'เชื่อมต่อฐานข้อมูลไม่สำเร็จ',
    body: 'ยืนยันตัวตนกับ Auth0 สำเร็จแล้ว แต่ยังดึงโปรไฟล์จาก Supabase ไม่ได้',
    email: null,
    showSetupChecklist: true,
    canLogout: true,
  }
}
