import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { env, isLive } from './env'

/**
 * Supabase client ที่ผูกกับ Auth0
 *
 * ใช้ตัวเลือก `accessToken` ของ supabase-js — ทุก request จะแนบ access token ของ Auth0
 * ไปเป็น Authorization header ทำให้ RLS ฝั่ง Postgres อ่าน `auth.jwt() ->> 'sub'` ได้
 * (ต้องเปิด Supabase → Authentication → Third Party Auth → Auth0 ก่อน)
 */

type TokenProvider = () => Promise<string>

let tokenProvider: TokenProvider | null = null

/** เรียกจาก <LiveSession/> หลัง Auth0 พร้อมใช้งาน */
export function setAccessTokenProvider(fn: TokenProvider | null) {
  tokenProvider = fn
}

/** แปลง error ของ auth0-spa-js ให้เป็นข้อความที่บอกทางแก้ได้จริง */
export function describeTokenError(e: unknown): string {
  const code = (e as { error?: string })?.error ?? ''
  const detail = e instanceof Error ? e.message : String(e)

  if (code === 'login_required' || code === 'consent_required') {
    return 'เซสชันกับ Auth0 หมดอายุแล้ว — กรุณาออกจากระบบแล้วเข้าสู่ระบบใหม่อีกครั้ง'
  }
  if (code === 'missing_refresh_token' || detail.includes('Missing Refresh Token')) {
    return (
      'ไม่มี refresh token สำหรับต่ออายุเซสชัน — ' +
      'ตรวจว่าเปิด "Allow Offline Access" ที่ API ใน Auth0 แล้ว จากนั้นออกจากระบบแล้วเข้าใหม่'
    )
  }
  if (code === 'timeout' || detail.includes('Timeout')) {
    return (
      'ต่ออายุเซสชันกับ Auth0 ไม่ทัน — ' +
      'มักเกิดจากเบราว์เซอร์บล็อกคุกกี้บุคคลที่สาม กรุณาออกจากระบบแล้วเข้าใหม่'
    )
  }
  return `ขอ access token จาก Auth0 ไม่สำเร็จ (${code || detail})`
}

/**
 * หา access token ที่จะแนบไปกับทุก request ของ Supabase
 *
 * ⚠️ ห้ามคืนค่าว่างเมื่อขอโทเคนไม่สำเร็จ มิฉะนั้น supabase-js จะถอยไปใช้ anon key
 *    แล้ว Postgres จะรายงานว่า "not authenticated" ซึ่งชี้ต้นเหตุผิดจุดโดยสิ้นเชิง
 *    (มีเทสต์คุมใน supabase.test.ts)
 */
export async function resolveAccessToken(): Promise<string> {
  // ยังไม่ล็อกอิน เช่น หน้าล็อกอินที่ต้องอ่านชื่อบริษัท/โลโก้ — ใช้สิทธิ์ anon ตามปกติ
  if (!tokenProvider) return ''
  try {
    return await tokenProvider()
  } catch (e) {
    throw new Error(describeTokenError(e))
  }
}

export const supabase: SupabaseClient | null = isLive
  ? createClient(env.supabase.url, env.supabase.anonKey, {
      accessToken: resolveAccessToken,
      db: { schema: 'public' },
      global: { headers: { 'x-application-name': 'company-portal' } },
    })
  : null

/** ใช้ในโค้ดที่รู้แน่ว่าอยู่โหมด live */
export function requireSupabase(): SupabaseClient {
  if (!supabase) {
    throw new Error('Supabase ยังไม่ได้ตั้งค่า — ระบบกำลังทำงานในโหมดสาธิต')
  }
  return supabase
}
