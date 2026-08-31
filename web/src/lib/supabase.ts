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

/** เรียกจาก <App/> หลัง Auth0 พร้อมใช้งาน */
export function setAccessTokenProvider(fn: TokenProvider | null) {
  tokenProvider = fn
}

export const supabase: SupabaseClient | null = isLive
  ? createClient(env.supabase.url, env.supabase.anonKey, {
      accessToken: async () => {
        if (!tokenProvider) return ''
        try {
          return await tokenProvider()
        } catch {
          return ''
        }
      },
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
