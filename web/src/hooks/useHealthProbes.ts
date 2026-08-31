import { useCallback, useEffect, useRef, useState } from 'react'
import { env } from '../lib/env'
import type { AppEntry, HealthResult } from '../lib/types'

/**
 * ตรวจสถานะการเข้าถึงแอป (โดยเฉพาะฝั่ง intranet ที่ต้องต่อ VPN)
 *
 * ข้อควรระวังที่พบบ่อย — Mixed Content:
 * หน้า Portal รันบน HTTPS (Vercel) ถ้า health_url เป็น http:// เบราว์เซอร์จะบล็อก
 * คำขอทิ้งเงียบ ๆ ทำให้ขึ้น "ออฟไลน์" ตลอดแม้ต่อ VPN แล้ว
 * โค้ดนี้จึงตรวจจับเคสนั้นแยกเป็นสถานะ 'blocked' พร้อมบอกวิธีแก้
 */

const MIXED_CONTENT_REASON =
  'หน้าเว็บนี้ทำงานบน HTTPS แต่ที่อยู่ตรวจสอบเป็น HTTP — เบราว์เซอร์บล็อกคำขอโดยอัตโนมัติ ' +
  'ต้องเปลี่ยนระบบภายในให้ให้บริการผ่าน HTTPS (ดู docs/PLAN.md เฟส 5)'

async function probe(url: string, timeoutMs: number): Promise<HealthResult> {
  if (typeof window !== 'undefined' &&
      window.location.protocol === 'https:' &&
      url.startsWith('http://')) {
    return { state: 'blocked', checkedAt: Date.now(), reason: MIXED_CONTENT_REASON }
  }

  const started = performance.now()

  // รอบแรก: ยิงแบบปกติ (ping.php ส่ง CORS header มาให้) เพื่ออ่านผลได้จริง
  try {
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), timeoutMs)
    try {
      const res = await fetch(url, {
        method: 'GET',
        cache: 'no-store',
        credentials: 'omit',
        signal: controller.signal,
      })
      if (res.ok) {
        return { state: 'online', checkedAt: Date.now(), latencyMs: Math.round(performance.now() - started) }
      }
    } finally {
      clearTimeout(timer)
    }
  } catch {
    /* ตกไปลองรอบสอง */
  }

  // รอบสอง: opaque request — ตอบได้แค่ "ถึง/ไม่ถึง" แต่ใช้ได้แม้ปลายทางไม่ได้ตั้ง CORS
  try {
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), timeoutMs)
    try {
      await fetch(url, {
        method: 'GET',
        mode: 'no-cors',
        cache: 'no-store',
        credentials: 'omit',
        signal: controller.signal,
      })
      return { state: 'online', checkedAt: Date.now(), latencyMs: Math.round(performance.now() - started) }
    } finally {
      clearTimeout(timer)
    }
  } catch {
    return { state: 'offline', checkedAt: Date.now() }
  }
}

export function useHealthProbes(apps: AppEntry[]) {
  const [results, setResults] = useState<Record<number, HealthResult>>({})
  const mounted = useRef(true)

  const targets = apps
    .filter((a) => !!a.health_url)
    .map((a) => ({ id: a.id, url: a.health_url as string }))

  // signature ใช้เป็น dependency เพื่อไม่ให้ re-run ทุกครั้งที่ array ถูกสร้างใหม่
  const signature = targets.map((t) => `${t.id}:${t.url}`).join('|')

  const runAll = useCallback(async () => {
    if (!signature) return
    const list = signature.split('|').map((s) => {
      const idx = s.indexOf(':')
      return { id: Number(s.slice(0, idx)), url: s.slice(idx + 1) }
    })

    setResults((prev) => {
      const next = { ...prev }
      for (const t of list) {
        next[t.id] = { ...(next[t.id] ?? { checkedAt: 0 }), state: 'checking' }
      }
      return next
    })

    const settled = await Promise.all(
      list.map(async (t) => [t.id, await probe(t.url, env.health.timeoutMs)] as const),
    )
    if (!mounted.current) return
    setResults((prev) => {
      const next = { ...prev }
      for (const [id, result] of settled) next[id] = result
      return next
    })
  }, [signature])

  useEffect(() => {
    mounted.current = true
    void runAll()
    const interval = setInterval(() => void runAll(), env.health.pollSeconds * 1000)
    const onFocus = () => void runAll()
    window.addEventListener('focus', onFocus)
    return () => {
      mounted.current = false
      clearInterval(interval)
      window.removeEventListener('focus', onFocus)
    }
  }, [runAll])

  return { results, refresh: runAll }
}
