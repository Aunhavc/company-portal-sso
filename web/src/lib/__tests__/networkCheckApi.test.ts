import { describe, it, expect, vi, beforeEach } from 'vitest'

// mock DNS ก่อน import handler — ให้ somjai.dyndns.org ชี้ 203.0.113.7 และ dead.example.com resolve ไม่ได้
vi.mock('node:dns/promises', () => ({
  resolve4: vi.fn(async (host: string) => {
    if (host === 'somjai.dyndns.org') return ['203.0.113.7']
    throw new Error('ENOTFOUND')
  }),
  resolve6: vi.fn(async () => {
    throw new Error('ENODATA')
  }),
}))

import handler from '../../../api/network-check'

function call(url: string, headers: Record<string, string> = {}, method = 'GET') {
  const res = {
    statusCode: 0,
    headers: {} as Record<string, string>,
    body: '',
    setHeader(k: string, v: string) {
      this.headers[k.toLowerCase()] = v
    },
    end(chunk?: string) {
      this.body = chunk ?? ''
    },
  }
  const req = { method, url, headers, socket: { remoteAddress: '10.0.0.9' } }
  // handler รับ IncomingMessage/ServerResponse — ใช้ของปลอมที่มีเฉพาะส่วนที่ handler แตะ
  return handler(req as never, res as never).then(() => ({ ...res, json: JSON.parse(res.body) }))
}

beforeEach(() => vi.clearAllMocks())

describe('GET /api/network-check', () => {
  it('IP ผู้ใช้ (x-forwarded-for) ตรงกับที่ DynDNS ชี้ → inside=true', async () => {
    const r = await call('/api/network-check?host=somjai.dyndns.org', { 'x-forwarded-for': '203.0.113.7, 76.76.21.1' })
    expect(r.statusCode).toBe(200)
    expect(r.headers['cache-control']).toBe('no-store')
    expect(r.json).toMatchObject({ inside: true, matched: 'somjai.dyndns.org', ip: '203.0.113.7' })
  })

  it('IP ผู้ใช้ไม่ตรง (Hotspot) → inside=false และยังรายงาน IP ให้ผู้ใช้เห็น', async () => {
    const r = await call('/api/network-check?host=somjai.dyndns.org', { 'x-forwarded-for': '192.0.2.44' })
    expect(r.json).toMatchObject({ inside: false, matched: null, ip: '192.0.2.44' })
    expect(r.json.resolved).toEqual({ 'somjai.dyndns.org': ['203.0.113.7'] })
  })

  it('โฮสต์ที่ resolve ไม่ได้ถูกรายงานใน unresolved (admin จะได้เห็นว่าพิมพ์ผิด)', async () => {
    const r = await call('/api/network-check?host=somjai.dyndns.org,dead.example.com', {
      'x-forwarded-for': '203.0.113.7',
    })
    expect(r.json.inside).toBe(true)
    expect(r.json.unresolved).toEqual(['dead.example.com'])
  })

  it('ไม่ส่ง host มาเลย → inside=false (ไม่พัง)', async () => {
    const r = await call('/api/network-check', { 'x-forwarded-for': '203.0.113.7' })
    expect(r.json).toMatchObject({ inside: false, resolved: {}, unresolved: [] })
  })

  it('โฮสต์ที่เป็น IP ตรง ๆ ไม่ต้อง resolve', async () => {
    const r = await call('/api/network-check?host=198.51.100.9', { 'x-forwarded-for': '198.51.100.9' })
    expect(r.json).toMatchObject({ inside: true, matched: '198.51.100.9' })
  })

  it('method อื่นนอกจาก GET → 405', async () => {
    const r = await call('/api/network-check?host=somjai.dyndns.org', {}, 'POST')
    expect(r.statusCode).toBe(405)
  })
})
