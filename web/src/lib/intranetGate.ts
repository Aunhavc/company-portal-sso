/**
 * ด่านก่อนเปิดแอปภายในองค์กร
 *
 * พอร์ทัลรันบน HTTPS จึงตรวจสถานะแอป intranet ที่ยังเป็น HTTP ไม่ได้ (mixed content)
 * และแอปที่ไม่ได้ตั้ง health_url ก็ไม่รู้สถานะเลย — ถ้าเปิดแท็บไปเฉย ๆ ผู้ใช้นอก LAN
 * จะเห็นแค่หน้าเปล่า/โหลดไม่ขึ้น โดยไม่รู้ว่าต้องต่อ VPN (osTicket 7 ก.ย. 2569)
 *
 * กติกา: แอปภายในที่ "ยืนยันไม่ได้ว่าถึง" ให้ถามก่อนหนึ่งครั้งต่อแท็บ
 * เมื่อผู้ใช้กด "เปิดต่อไปเลย" จะจำไว้ใน sessionStorage (หายเมื่อปิดแท็บ)
 * แต่ถ้าตรวจแล้ว "รู้ชัดว่าไม่ถึง" (offline/blocked) จะถามทุกครั้ง
 */
import type { AppEntry, HealthResult } from './types'

export type Gate = 'open' | 'ask'

const KEY_PREFIX = 'portal.intranet.proceed:'

/** สำรองไว้กรณี sessionStorage ใช้ไม่ได้ (โหมดส่วนตัวบางเบราว์เซอร์, iframe) */
const memory = new Set<string>()

const keyOf = (app: AppEntry) => `${KEY_PREFIX}${app.id}`

function storage(): Storage | null {
  try {
    return typeof sessionStorage === 'undefined' ? null : sessionStorage
  } catch {
    return null
  }
}

function hasProceeded(app: AppEntry): boolean {
  const key = keyOf(app)
  if (memory.has(key)) return true
  try {
    return storage()?.getItem(key) === '1'
  } catch {
    return false
  }
}

export function gateBeforeOpen(app: AppEntry, health: HealthResult | undefined): Gate {
  if (app.network !== 'intranet') return 'open'
  const state = health?.state ?? 'unknown'
  if (state === 'online') return 'open'
  if (state === 'offline' || state === 'blocked') return 'ask'
  // unknown / checking — ยืนยันไม่ได้ ถามครั้งเดียวต่อแท็บ
  return hasProceeded(app) ? 'open' : 'ask'
}

export function rememberProceed(app: AppEntry): void {
  const key = keyOf(app)
  memory.add(key)
  try {
    storage()?.setItem(key, '1')
  } catch {
    /* จำในหน่วยความจำอย่างเดียวก็พอ */
  }
}

/** ใช้ในเทสต์ และตอนออกจากระบบ */
export function forgetProceeds({ memoryOnly = false }: { memoryOnly?: boolean } = {}): void {
  memory.clear()
  if (memoryOnly) return
  try {
    const s = storage()
    if (!s) return
    const keys: string[] = []
    for (let i = 0; i < s.length; i++) {
      const k = s.key(i)
      if (k?.startsWith(KEY_PREFIX)) keys.push(k)
    }
    for (const k of keys) s.removeItem(k)
  } catch {
    /* ไม่เป็นไร */
  }
}
