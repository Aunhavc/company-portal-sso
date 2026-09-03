/**
 * ค่าตั้งต้นของ Auth0Provider แยกออกมาเป็นโมดูลล้วน เพื่อให้ทดสอบได้โดยไม่ต้อง render React
 *
 * ⚠️ ข้อบังคับที่ห้ามผิดพลาด (มีเทสต์คุมใน auth0Config.test.ts)
 *   เปิด useRefreshTokens = true → scope ต้องมี 'offline_access' เสมอ
 *   มิฉะนั้น Auth0 จะไม่ออก refresh token แล้วการต่ออายุโทเคนจะตกไปใช้
 *   iframe ซ่อน ซึ่งพึ่งคุกกี้บุคคลที่สาม — พังกับ Safari / Firefox / โหมดไม่ระบุตัวตน
 */
import { env } from './env'

export const AUTH0_SCOPES = ['openid', 'profile', 'email', 'offline_access'] as const

export interface Auth0Options {
  domain: string
  clientId: string
  authorizationParams: {
    redirect_uri: string
    audience?: string
    scope: string
  }
  cacheLocation: 'localstorage' | 'memory'
  useRefreshTokens: boolean
}

export function buildAuth0Options(origin: string): Auth0Options {
  return {
    domain: env.auth0.domain,
    clientId: env.auth0.clientId,
    authorizationParams: {
      redirect_uri: origin,
      audience: env.auth0.audience,
      scope: AUTH0_SCOPES.join(' '),
    },
    cacheLocation: 'localstorage',
    useRefreshTokens: true,
  }
}

/**
 * ตรวจความสอดคล้องของค่าตั้งต้น — คืนรายการปัญหาที่พบ (ว่าง = ผ่าน)
 * เรียกได้ทั้งจากเทสต์และจากโค้ดจริงตอนเริ่มระบบ
 */
export function auth0ConfigProblems(opts: Auth0Options): string[] {
  const problems: string[] = []
  const scopes = opts.authorizationParams.scope.split(/\s+/).filter(Boolean)

  if (opts.useRefreshTokens && !scopes.includes('offline_access')) {
    problems.push(
      'เปิด useRefreshTokens แต่ scope ไม่มี offline_access — Auth0 จะไม่ออก refresh token',
    )
  }
  if (!scopes.includes('openid')) {
    problems.push('scope ต้องมี openid')
  }
  if (!scopes.includes('email')) {
    problems.push('scope ต้องมี email มิฉะนั้น sync_profile() จะไม่มี claim email')
  }
  if (opts.useRefreshTokens && opts.cacheLocation !== 'localstorage') {
    problems.push('ใช้ refresh token ควรเก็บแคชใน localstorage เพื่อให้อยู่ข้ามการรีเฟรชหน้า')
  }
  if (new Set(scopes).size !== scopes.length) {
    problems.push('scope มีค่าซ้ำ')
  }
  return problems
}

/** คีย์ที่ auth0-spa-js ใช้เก็บแคชโทเคนใน localStorage */
export const AUTH0_CACHE_PREFIX = '@@auth0spajs@@'

/**
 * ล้างแคชโทเคนของ Auth0 ทิ้ง
 *
 * ใช้ตอนแคชเดิม "ค้าง" อยู่ในสภาพที่ใช้ต่อไม่ได้ เช่น เป็นแคชที่ออกก่อนระบบ
 * จะเริ่มขอ scope offline_access จึงไม่มี refresh token อยู่ข้างใน
 * ล้างแล้วต้องพาไปล็อกอินใหม่เสมอ
 */
export function clearAuth0Cache(): number {
  if (typeof localStorage === 'undefined') return 0
  const doomed: string[] = []
  for (let i = 0; i < localStorage.length; i += 1) {
    const key = localStorage.key(i)
    if (key && key.startsWith(AUTH0_CACHE_PREFIX)) doomed.push(key)
  }
  doomed.forEach((k) => localStorage.removeItem(k))
  return doomed.length
}

/**
 * ตัวเลือกที่ส่งให้ loginWithRedirect
 *
 * Auth0 Universal Login ไม่แสดงปุ่มของ enterprise connection ให้เสมอไป
 * พอร์ทัลจึงระบุ connection เองตรง ๆ เพื่อพาผู้ใช้ไปยังช่องทางที่ต้องการแน่นอน
 *
 * ลำดับความสำคัญ: ค่าที่ส่งเข้ามา > ค่าบังคับจาก env > ไม่ระบุ (ให้ Auth0 เลือกเอง)
 */
export function buildLoginParams(
  connection?: string,
): { authorizationParams: { connection: string } } | undefined {
  const chosen = (connection ?? env.auth0.connection ?? '').trim()
  if (!chosen) return undefined
  return { authorizationParams: { connection: chosen } }
}

/** ชื่อ connection ของ AD ถ้าตั้งค่าไว้ */
export function adConnectionName(): string | undefined {
  const name = (env.auth0.adConnection ?? '').trim()
  return name || undefined
}
