/**
 * ด่านก่อนเปิดแอปภายในองค์กร
 *
 * พอร์ทัลรันบน HTTPS จึงตรวจสถานะแอป intranet ที่ยังเป็น HTTP ไม่ได้ (mixed content)
 * และแอปที่ไม่ได้ตั้ง health_url ก็ไม่รู้สถานะเลย — ถ้าเปิดแท็บไปเฉย ๆ ผู้ใช้นอก LAN
 * จะเห็นแค่ "This site can't be reached" โดยไม่รู้ว่าต้องต่อ VPN (osTicket 7 ก.ย. 2569)
 *
 * กติกา: แอปภายในจะเปิดตรงได้ก็ต่อเมื่อ "ตรวจแล้วถึง" (online) เท่านั้น
 * นอกนั้นถามทุกครั้ง — ไม่จำคำตอบ เพราะผู้ใช้สลับเครือข่ายได้ (LAN → Hotspot)
 * โดยที่พอร์ทัลไม่มีทางรู้ การจำคำตอบเคยทำให้เปิดเงียบ ๆ แล้วเจอหน้า error
 */
import type { AppEntry, HealthResult } from './types'

export type Gate = 'open' | 'ask'

export function gateBeforeOpen(app: AppEntry, health: HealthResult | undefined): Gate {
  if (app.network !== 'intranet') return 'open'
  return health?.state === 'online' ? 'open' : 'ask'
}
