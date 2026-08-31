/**
 * อ่านและตรวจสอบ environment variables
 *
 * ระบบทำงานได้ 2 โหมด:
 *  - live : ตั้ง VITE_AUTH0_* และ VITE_SUPABASE_* ครบ → ใช้ Auth0 + Supabase จริง
 *  - demo : ยังไม่ได้ตั้ง → ใช้ข้อมูลจำลองใน localStorage เพื่อให้เปิดเว็บดูได้ทันที
 */

const raw = import.meta.env

function str(key: string, fallback = ''): string {
  const v = raw[key as keyof typeof raw]
  return typeof v === 'string' ? v.trim() : fallback
}

function num(key: string, fallback: number): number {
  const n = Number(str(key))
  return Number.isFinite(n) && n > 0 ? n : fallback
}

const auth0Domain = str('VITE_AUTH0_DOMAIN')
const auth0ClientId = str('VITE_AUTH0_CLIENT_ID')
const auth0Audience = str('VITE_AUTH0_AUDIENCE')
const supabaseUrl = str('VITE_SUPABASE_URL')
const supabaseAnonKey = str('VITE_SUPABASE_ANON_KEY')

const placeholder = (v: string) =>
  !v || v.startsWith('your-') || v.includes('xxxx') || v.includes('example.co')

export const auth0Configured = !placeholder(auth0Domain) && !placeholder(auth0ClientId)
export const supabaseConfigured = !placeholder(supabaseUrl) && !placeholder(supabaseAnonKey)

/** true = ใช้ระบบจริงทั้งหมด, false = โหมดสาธิต */
export const isLive = auth0Configured && supabaseConfigured

export const env = {
  auth0: {
    domain: auth0Domain,
    clientId: auth0ClientId,
    audience: auth0Audience || undefined,
    connection: str('VITE_AUTH0_CONNECTION') || undefined,
  },
  supabase: {
    url: supabaseUrl,
    anonKey: supabaseAnonKey,
  },
  companyName: str('VITE_COMPANY_NAME', 'Company Portal'),
  health: {
    pollSeconds: num('VITE_HEALTH_POLL_SECONDS', 45),
    timeoutMs: num('VITE_HEALTH_TIMEOUT_MS', 2500),
  },
} as const

/** รายการสิ่งที่ยังตั้งค่าไม่ครบ — ใช้แสดงบนแบนเนอร์โหมดสาธิต */
export function missingConfigKeys(): string[] {
  const missing: string[] = []
  if (placeholder(auth0Domain)) missing.push('VITE_AUTH0_DOMAIN')
  if (placeholder(auth0ClientId)) missing.push('VITE_AUTH0_CLIENT_ID')
  if (placeholder(auth0Audience)) missing.push('VITE_AUTH0_AUDIENCE')
  if (placeholder(supabaseUrl)) missing.push('VITE_SUPABASE_URL')
  if (placeholder(supabaseAnonKey)) missing.push('VITE_SUPABASE_ANON_KEY')
  return missing
}
