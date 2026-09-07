/**
 * GET /api/network-check?host=somjai.dyndns.org,branch.example.com
 *
 * ตอบว่า "ผู้ที่เรียกอยู่ในเครือข่ายบริษัทหรือไม่" โดยเทียบ IP สาธารณะของผู้เรียก
 * กับ IP ที่ชื่อโฮสต์ (DynDNS ของบริษัท) resolve ได้ในขณะนั้น
 *
 * - ไม่มีความลับ ไม่แตะฐานข้อมูล — รายชื่อโฮสต์มาจากตั้งค่าองค์กรที่เบราว์เซอร์ส่งมา
 * - resolve ทั้ง A และ AAAA เผื่อสำนักงานออกเน็ตด้วย IPv6
 * - ตอบ no-store เสมอ เพราะผลขึ้นกับผู้เรียกแต่ละคน
 */
import type { IncomingMessage, ServerResponse } from 'node:http'
import { resolve4, resolve6 } from 'node:dns/promises'
// ต้องมี .js — package.json เป็น "type": "module" Vercel จึงรันไฟล์นี้เป็น ESM
// ซึ่ง Node ไม่ยอมรับ import แบบไม่มีนามสกุล (ERR_MODULE_NOT_FOUND → FUNCTION_INVOCATION_FAILED)
import {
  clientIpFromHeaders,
  decideInside,
  parseHostList,
  type NetworkCheckResult,
} from '../src/lib/networkCheck.js'

const RESOLVE_TIMEOUT_MS = 4000

async function resolveHost(host: string): Promise<string[]> {
  // โฮสต์ที่เป็น IP อยู่แล้วไม่ต้อง resolve
  if (/^[\d.]+$/.test(host) || host.includes(':')) return [host]
  const timeout = new Promise<never>((_, reject) =>
    setTimeout(() => reject(new Error('DNS timeout')), RESOLVE_TIMEOUT_MS),
  )
  const [a, aaaa] = await Promise.race([
    Promise.all([resolve4(host).catch(() => [] as string[]), resolve6(host).catch(() => [] as string[])]),
    timeout,
  ])
  return [...a, ...aaaa]
}

export default async function handler(req: IncomingMessage, res: ServerResponse): Promise<void> {
  res.setHeader('Cache-Control', 'no-store')
  res.setHeader('Content-Type', 'application/json; charset=utf-8')

  if (req.method !== 'GET') {
    res.statusCode = 405
    res.end(JSON.stringify({ error: 'method not allowed' }))
    return
  }

  const url = new URL(req.url ?? '/', 'http://localhost')
  const hosts = parseHostList(url.searchParams.get('host') ?? '')
  const ip = clientIpFromHeaders(
    {
      'x-forwarded-for': req.headers['x-forwarded-for'],
      'x-real-ip': req.headers['x-real-ip'],
    },
    req.socket?.remoteAddress,
  )

  const resolved: Record<string, string[]> = {}
  const unresolved: string[] = []
  await Promise.all(
    hosts.map(async (h) => {
      try {
        const ips = await resolveHost(h)
        if (ips.length) resolved[h] = ips
        else unresolved.push(h)
      } catch {
        unresolved.push(h)
      }
    }),
  )

  const body: NetworkCheckResult = {
    ...decideInside(ip, resolved),
    ip,
    resolved,
    unresolved,
    checkedAt: new Date().toISOString(),
  }
  res.statusCode = 200
  res.end(JSON.stringify(body))
}
