import { describe, it, expect, beforeEach } from 'vitest'
import {
  buildAuth0Options,
  auth0ConfigProblems,
  AUTH0_SCOPES,
  clearAuth0Cache,
  AUTH0_CACHE_PREFIX,
} from '../auth0Config'

describe('ค่าตั้งต้นของ Auth0', () => {
  const opts = buildAuth0Options('https://portal.example.com')

  it('ผ่านการตรวจความสอดคล้องทุกข้อ', () => {
    expect(auth0ConfigProblems(opts)).toEqual([])
  })

  // เทสต์นี้คือด่านกันบั๊กที่เคยหลุดขึ้น production จริง (56e43bb)
  it('ขอ offline_access เสมอเมื่อเปิด useRefreshTokens', () => {
    expect(opts.useRefreshTokens).toBe(true)
    expect(opts.authorizationParams.scope.split(' ')).toContain('offline_access')
  })

  it('ขอ openid และ email ครบ — sync_profile() ต้องใช้ claim email', () => {
    const scopes = opts.authorizationParams.scope.split(' ')
    expect(scopes).toContain('openid')
    expect(scopes).toContain('email')
  })

  it('เก็บแคชโทเคนใน localstorage เพื่อให้อยู่ข้ามการรีเฟรชหน้า', () => {
    expect(opts.cacheLocation).toBe('localstorage')
  })

  it('ส่ง redirect_uri ตาม origin ที่รับเข้ามา', () => {
    expect(buildAuth0Options('https://a.test').authorizationParams.redirect_uri).toBe(
      'https://a.test',
    )
  })

  it('ไม่มี scope ซ้ำ', () => {
    expect(new Set(AUTH0_SCOPES).size).toBe(AUTH0_SCOPES.length)
  })
})

describe('auth0ConfigProblems จับค่าที่ผิดได้จริง', () => {
  const base = buildAuth0Options('https://portal.example.com')
  const withScope = (scope: string) => ({
    ...base,
    authorizationParams: { ...base.authorizationParams, scope },
  })

  it('จับกรณีเปิด refresh token แต่ลืม offline_access', () => {
    const problems = auth0ConfigProblems(withScope('openid profile email'))
    expect(problems.some((p) => p.includes('offline_access'))).toBe(true)
  })

  it('จับกรณีไม่มี email', () => {
    const problems = auth0ConfigProblems(withScope('openid profile offline_access'))
    expect(problems.some((p) => p.includes('email'))).toBe(true)
  })

  it('จับกรณีไม่มี openid', () => {
    const problems = auth0ConfigProblems(withScope('profile email offline_access'))
    expect(problems.some((p) => p.includes('openid'))).toBe(true)
  })

  it('จับกรณี scope ซ้ำ', () => {
    const problems = auth0ConfigProblems(withScope('openid openid profile email offline_access'))
    expect(problems.some((p) => p.includes('ซ้ำ'))).toBe(true)
  })

  it('จับกรณีใช้ refresh token แต่แคชไว้ในหน่วยความจำ', () => {
    const problems = auth0ConfigProblems({ ...base, cacheLocation: 'memory' })
    expect(problems.some((p) => p.includes('localstorage'))).toBe(true)
  })
})

describe('clearAuth0Cache', () => {
  beforeEach(() => localStorage.clear())

  it('ลบเฉพาะแคชของ Auth0 ไม่แตะข้อมูลอื่น', () => {
    localStorage.setItem(`${AUTH0_CACHE_PREFIX}::client::aud::scope`, 'token')
    localStorage.setItem(`${AUTH0_CACHE_PREFIX}::client::@@user@@`, 'user')
    localStorage.setItem('portal.demo.signedIn', '1')
    localStorage.setItem('company.logo', 'data:image/png;base64,xxx')

    expect(clearAuth0Cache()).toBe(2)
    expect(localStorage.getItem('portal.demo.signedIn')).toBe('1')
    expect(localStorage.getItem('company.logo')).not.toBeNull()
    expect(localStorage.getItem(`${AUTH0_CACHE_PREFIX}::client::aud::scope`)).toBeNull()
  })

  it('ไม่พังเมื่อไม่มีแคชให้ลบ', () => {
    expect(clearAuth0Cache()).toBe(0)
  })
})
