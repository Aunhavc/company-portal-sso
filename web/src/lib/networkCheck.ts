/**
 * ตรรกะ "ผู้ใช้อยู่ในเครือข่ายบริษัทหรือไม่" — ส่วนที่ไม่แตะเครือข่าย
 *
 * ทำไมต้องมี: พอร์ทัลรันบน HTTPS เบราว์เซอร์จึงห้ามยิงไปตรวจแอป intranet ที่เป็น HTTP
 * (mixed content) ทุกวิธี → ตรวจไม่ได้ว่า 192.168.x.x ถึงหรือไม่
 * ทางออก: เทียบ "IP สาธารณะของผู้ใช้" กับ IP ที่ชื่อ DynDNS ของบริษัท resolve ได้
 * เครื่องในสำนักงานและเครื่องที่ต่อ VPN แบบ full-tunnel จะออกอินเทอร์เน็ตด้วย IP ของบริษัท
 *
 * ไฟล์นี้ใช้ร่วมกันระหว่างเบราว์เซอร์และ Vercel function (api/network-check.ts)
 * จึงต้องไม่ import อะไรจาก Node
 */

export const MAX_HOSTS = 10

// ต้องเป็นชื่อเต็มมีจุดอย่างน้อยหนึ่งจุด (somjai.dyndns.org) — ชื่อคำเดียวใช้กับ DNS สาธารณะไม่ได้
const HOSTNAME_RE = /^(?=.{1,253}$)[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?(\.[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?)+$/
const IPV4_RE = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/
const IPV6_RE = /^[0-9a-f:]+$/

function isIpv4(s: string): boolean {
  const m = IPV4_RE.exec(s)
  return !!m && m.slice(1).every((n) => Number(n) <= 255)
}

function isIpv6(s: string): boolean {
  return s.includes(':') && IPV6_RE.test(s)
}

/** รายการชื่อโฮสต์/IP จากช่องตั้งค่า (คั่นด้วย , ช่องว่าง หรือขึ้นบรรทัดใหม่) — ทิ้งค่าที่ไม่ใช่ */
export function parseHostList(raw: string): string[] {
  const out: string[] = []
  for (const token of raw.split(/[\s,]+/)) {
    const h = token.trim().toLowerCase()
    if (!h) continue
    if (!(HOSTNAME_RE.test(h) || isIpv4(h) || isIpv6(h))) continue
    if (out.includes(h)) continue
    out.push(h)
    if (out.length >= MAX_HOSTS) break
  }
  return out
}

/** ทำ IP ให้เทียบกันได้: ตัดช่องว่าง ตัวพิมพ์เล็ก ถอด ::ffff: ของ IPv4-mapped */
export function normalizeIp(ip: string): string {
  const s = ip.trim().toLowerCase()
  return s.startsWith('::ffff:') && isIpv4(s.slice(7)) ? s.slice(7) : s
}

type HeaderValue = string | string[] | undefined
export interface IpHeaders {
  'x-forwarded-for'?: HeaderValue
  'x-real-ip'?: HeaderValue
}

function first(v: HeaderValue): string | null {
  const s = Array.isArray(v) ? v[0] : v
  if (!s) return null
  const head = s.split(',')[0]?.trim()
  return head ? head : null
}

/** IP ผู้ใช้ตามที่ proxy ของ Vercel ส่งมา — ตัวแรกของ x-forwarded-for คือปลายทางจริง */
export function clientIpFromHeaders(headers: IpHeaders, remoteAddress?: string | null): string | null {
  const raw = first(headers['x-forwarded-for']) ?? first(headers['x-real-ip']) ?? remoteAddress ?? null
  return raw ? normalizeIp(raw) : null
}

export interface Decision {
  inside: boolean
  /** ชื่อโฮสต์ที่ IP ผู้ใช้ตรงด้วย (ไว้แสดงให้ admin ตรวจสอบ) */
  matched: string | null
}

/** เทียบ IP ผู้ใช้กับ IP ที่แต่ละโฮสต์ resolve ได้ — ไม่รู้/ไม่ตรง = นอกเครือข่าย */
export function decideInside(clientIp: string | null, resolved: Record<string, string[]>): Decision {
  if (!clientIp) return { inside: false, matched: null }
  const ip = normalizeIp(clientIp)
  for (const [host, ips] of Object.entries(resolved)) {
    if (ips.some((x) => normalizeIp(x) === ip)) return { inside: true, matched: host }
  }
  return { inside: false, matched: null }
}

/** รูปแบบคำตอบของ GET /api/network-check */
export interface NetworkCheckResult extends Decision {
  ip: string | null
  resolved: Record<string, string[]>
  /** โฮสต์ที่ resolve ไม่ได้ (พิมพ์ผิด / DynDNS ยังไม่อัปเดต) */
  unresolved: string[]
  checkedAt: string
}
