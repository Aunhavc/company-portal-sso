import { describe, it, expect, beforeEach } from 'vitest'
import { setAccessTokenProvider, resolveAccessToken, describeTokenError } from '../supabase'

function auth0Error(code: string, message = code) {
  return Object.assign(new Error(message), { error: code })
}

describe('resolveAccessToken', () => {
  beforeEach(() => setAccessTokenProvider(null))

  it('คืนค่าว่างเมื่อยังไม่ล็อกอิน — ให้ยิงด้วยสิทธิ์ anon ตามปกติ', async () => {
    await expect(resolveAccessToken()).resolves.toBe('')
  })

  it('คืนโทเคนที่ได้จาก Auth0 เมื่อขอสำเร็จ', async () => {
    setAccessTokenProvider(async () => 'eyJ.header.payload')
    await expect(resolveAccessToken()).resolves.toBe('eyJ.header.payload')
  })

  // ด่านกันบั๊กที่หลุดขึ้น production จริง: เดิม catch แล้ว return '' เงียบ ๆ
  // ทำให้ request ถูกยิงด้วย anon key แล้ว Postgres ตอบ "not authenticated"
  it('โยน error ไม่กลืนเงียบ เมื่อขอโทเคนไม่สำเร็จ', async () => {
    setAccessTokenProvider(async () => {
      throw auth0Error('login_required')
    })
    await expect(resolveAccessToken()).rejects.toThrow()
  })

  it('ไม่คืนค่าว่างเด็ดขาดเมื่อขอโทเคนล้มเหลว', async () => {
    const codes = ['login_required', 'consent_required', 'missing_refresh_token', 'timeout', 'boom']
    for (const code of codes) {
      setAccessTokenProvider(async () => {
        throw auth0Error(code)
      })
      let returned: string | undefined
      try {
        returned = await resolveAccessToken()
      } catch {
        returned = undefined
      }
      expect(returned, `code=${code} ต้องไม่คืนค่าว่าง`).toBeUndefined()
    }
  })

  it('กลับไปใช้สิทธิ์ anon ได้อีกครั้งหลังล้างผู้ให้โทเคน (ตอนออกจากระบบ)', async () => {
    setAccessTokenProvider(async () => 'token')
    await expect(resolveAccessToken()).resolves.toBe('token')
    setAccessTokenProvider(null)
    await expect(resolveAccessToken()).resolves.toBe('')
  })
})

describe('describeTokenError บอกทางแก้ได้ตรงกรณี', () => {
  it('เซสชันหมดอายุ', () => {
    expect(describeTokenError(auth0Error('login_required'))).toContain('เข้าสู่ระบบใหม่')
  })

  it('ไม่มี refresh token → ชี้ไปที่ Allow Offline Access', () => {
    expect(describeTokenError(auth0Error('missing_refresh_token'))).toContain('Allow Offline Access')
  })

  it('จับจากข้อความได้แม้ไม่มีรหัส error', () => {
    expect(describeTokenError(new Error('Missing Refresh Token'))).toContain('Allow Offline Access')
  })

  it('หมดเวลา → ชี้ไปที่คุกกี้บุคคลที่สาม', () => {
    expect(describeTokenError(auth0Error('timeout'))).toContain('คุกกี้บุคคลที่สาม')
  })

  it('error ที่ไม่รู้จักยังได้ข้อความที่อ่านรู้เรื่อง', () => {
    const msg = describeTokenError(auth0Error('weird_code'))
    expect(msg).toContain('weird_code')
    expect(msg.length).toBeGreaterThan(10)
  })

  it('รับค่าที่ไม่ใช่ Error ได้โดยไม่พัง', () => {
    expect(() => describeTokenError('พัง')).not.toThrow()
    expect(() => describeTokenError(null)).not.toThrow()
    expect(() => describeTokenError(undefined)).not.toThrow()
  })
})
