/**
 * กัน "JWT issued at future" จาก Supabase (PostgREST)
 *
 * PostgREST เทียบค่า iat ในโทเคนของ Auth0 กับนาฬิกาของเซิร์ฟเวอร์ตัวเอง
 * ถ้านาฬิกา Auth0 เร็วกว่าไม่กี่วินาที โทเคนที่เพิ่งออกจะถูกปฏิเสธ
 * ทั้งที่ทุกอย่างตั้งค่าถูกต้อง (เหตุการณ์จริง 7 ก.ย. 2569 กระทบทุกคนตอนเช้า)
 * รอสักครู่ให้เวลาฝั่ง Supabase ไล่ทัน iat แล้วยิงซ้ำด้วยโทเคนใบเดิมก็ผ่าน
 */

type WithError = { error: { message: string } | null }

type Options = {
  /** จำนวนครั้งรวมครั้งแรก */
  attempts?: number
  /** เวลารอระหว่างครั้ง (มิลลิวินาที) */
  delayMs?: number
  /** ฉีดแทนได้ในเทสต์ */
  sleep?: (ms: number) => Promise<void>
}

const defaultSleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms))

export function isClockSkewError(error: { message?: string } | null | undefined): boolean {
  return /issued at future/i.test(error?.message ?? '')
}

/**
 * ลองซ้ำเฉพาะกรณี clock skew — error อื่นและ exception ส่งต่อทันที ไม่ซ่อนปัญหาจริง
 * รับ PromiseLike เพราะ query builder ของ supabase-js เป็น thenable ไม่ใช่ Promise แท้
 */
export async function retryOnClockSkew<T extends WithError>(
  fn: () => PromiseLike<T>,
  { attempts = 3, delayMs = 3000, sleep = defaultSleep }: Options = {},
): Promise<T> {
  let result = await fn()
  for (let i = 1; i < attempts && isClockSkewError(result.error); i++) {
    await sleep(delayMs)
    result = await fn()
  }
  return result
}
