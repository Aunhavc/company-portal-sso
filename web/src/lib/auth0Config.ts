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
