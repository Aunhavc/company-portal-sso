import { describe, it, expect, vi } from 'vitest'
import { isClockSkewError, retryOnClockSkew } from '../clockSkew'

// เหตุการณ์จริง 7 ก.ย. 2569: ทุกคนล็อกอินไม่ได้ตอนเช้า Supabase ตอบ "JWT issued at future"
// เพราะนาฬิกา Auth0 เร็วกว่า Supabase ไม่กี่วินาที — ออกแล้วเข้าใหม่ก็ผ่าน
const skew = { error: { message: 'JWT issued at future' } }
const ok = { error: null, data: 'profile' }
const other = { error: { message: 'permission denied for table profiles' } }

describe('isClockSkewError', () => {
  it('จับข้อความของ PostgREST ได้ ไม่สนตัวพิมพ์', () => {
    expect(isClockSkewError({ message: 'JWT issued at future' })).toBe(true)
    expect(isClockSkewError({ message: 'jwt Issued At Future' })).toBe(true)
  })

  it('ไม่จับ error อื่นและค่าว่าง', () => {
    expect(isClockSkewError(other.error)).toBe(false)
    expect(isClockSkewError(null)).toBe(false)
    expect(isClockSkewError(undefined)).toBe(false)
  })
})

describe('retryOnClockSkew', () => {
  it('สำเร็จครั้งแรก → ไม่รอ ไม่เรียกซ้ำ', async () => {
    const fn = vi.fn().mockResolvedValue(ok)
    const sleep = vi.fn().mockResolvedValue(undefined)
    await expect(retryOnClockSkew(fn, { sleep })).resolves.toBe(ok)
    expect(fn).toHaveBeenCalledTimes(1)
    expect(sleep).not.toHaveBeenCalled()
  })

  it('error อื่น → คืนทันที ไม่ลองซ้ำ (ไม่ซ่อนปัญหาจริง)', async () => {
    const fn = vi.fn().mockResolvedValue(other)
    const sleep = vi.fn().mockResolvedValue(undefined)
    await expect(retryOnClockSkew(fn, { sleep })).resolves.toBe(other)
    expect(fn).toHaveBeenCalledTimes(1)
    expect(sleep).not.toHaveBeenCalled()
  })

  it('เจอ skew → รอตามที่กำหนดแล้วลองใหม่จนผ่าน', async () => {
    const fn = vi.fn().mockResolvedValueOnce(skew).mockResolvedValueOnce(skew).mockResolvedValueOnce(ok)
    const sleep = vi.fn().mockResolvedValue(undefined)
    await expect(retryOnClockSkew(fn, { sleep, delayMs: 1234 })).resolves.toBe(ok)
    expect(fn).toHaveBeenCalledTimes(3)
    expect(sleep).toHaveBeenCalledTimes(2)
    expect(sleep).toHaveBeenCalledWith(1234)
  })

  it('ยัง skew ครบจำนวนครั้ง → คืน error ล่าสุด ไม่วนไม่รู้จบ', async () => {
    const fn = vi.fn().mockResolvedValue(skew)
    const sleep = vi.fn().mockResolvedValue(undefined)
    await expect(retryOnClockSkew(fn, { sleep, attempts: 3 })).resolves.toBe(skew)
    expect(fn).toHaveBeenCalledTimes(3)
    expect(sleep).toHaveBeenCalledTimes(2)
  })

  it('ค่าตั้งต้น: ลอง 3 ครั้ง เว้น 3 วินาที (พอให้นาฬิกา Supabase ไล่ทัน iat)', async () => {
    const fn = vi.fn().mockResolvedValue(skew)
    const sleep = vi.fn().mockResolvedValue(undefined)
    await retryOnClockSkew(fn, { sleep })
    expect(fn).toHaveBeenCalledTimes(3)
    expect(sleep).toHaveBeenCalledWith(3000)
  })

  it('fn โยน exception → ส่งต่อทันที ไม่ลองซ้ำ', async () => {
    const fn = vi.fn().mockRejectedValue(new Error('network down'))
    const sleep = vi.fn().mockResolvedValue(undefined)
    await expect(retryOnClockSkew(fn, { sleep })).rejects.toThrow('network down')
    expect(fn).toHaveBeenCalledTimes(1)
  })
})
