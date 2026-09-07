import { describe, it, expect } from 'vitest'
import { parseHostList, clientIpFromHeaders, normalizeIp, decideInside } from '../networkCheck'

// ข้อกำหนด 7 ก.ย. 2569: "ดื้อกดไปโดยไม่ต่อ VPN ต้องขึ้นหน้าแจ้งให้ต่อ VPN ไม่ใช่ error screen"
// พอร์ทัล (HTTPS) ตรวจปลายทาง HTTP ไม่ได้ → ใช้ IP สาธารณะของผู้ใช้เทียบกับชื่อ DynDNS ของบริษัทแทน

describe('parseHostList', () => {
  it('รับได้ทั้งคั่นด้วยจุลภาค ช่องว่าง และขึ้นบรรทัดใหม่ · ตัดช่องว่าง · ตัวพิมพ์เล็ก · ไม่ซ้ำ', () => {
    expect(parseHostList(' Somjai.DynDNS.org, 203.0.113.7\nsomjai.dyndns.org  vpn.example.com ')).toEqual([
      'somjai.dyndns.org',
      '203.0.113.7',
      'vpn.example.com',
    ])
  })

  it('ทิ้งค่าที่ไม่ใช่ชื่อโฮสต์/IP (กันคนยัด URL หรือ path มา)', () => {
    expect(parseHostList('http://x.com, a b, good.host, -bad.host, ok-host.co.th')).toEqual([
      'good.host',
      'ok-host.co.th',
    ])
  })

  it('ว่าง → รายการว่าง', () => {
    expect(parseHostList('')).toEqual([])
    expect(parseHostList('   ')).toEqual([])
  })

  it('จำกัดไม่เกิน 10 รายการ', () => {
    const many = Array.from({ length: 15 }, (_, i) => `h${i}.example.com`).join(',')
    expect(parseHostList(many)).toHaveLength(10)
  })
})

describe('normalizeIp', () => {
  it('ถอด IPv4-mapped IPv6 (::ffff:1.2.3.4) และตัวพิมพ์', () => {
    expect(normalizeIp('::ffff:203.0.113.7')).toBe('203.0.113.7')
    expect(normalizeIp('2001:DB8::1')).toBe('2001:db8::1')
    expect(normalizeIp(' 203.0.113.7 ')).toBe('203.0.113.7')
  })
})

describe('clientIpFromHeaders', () => {
  it('ใช้ตัวแรกของ x-forwarded-for (IP จริงของผู้ใช้ ก่อนผ่าน proxy)', () => {
    expect(clientIpFromHeaders({ 'x-forwarded-for': '203.0.113.7, 10.0.0.1' })).toBe('203.0.113.7')
  })

  it('ถอยไปใช้ x-real-ip แล้ว remote address ตามลำดับ', () => {
    expect(clientIpFromHeaders({ 'x-real-ip': '198.51.100.9' })).toBe('198.51.100.9')
    expect(clientIpFromHeaders({}, '::ffff:192.0.2.5')).toBe('192.0.2.5')
  })

  it('ไม่มีอะไรเลย → null', () => {
    expect(clientIpFromHeaders({})).toBeNull()
  })

  it('รับ header แบบ array ได้ (Node รวมค่าซ้ำเป็น array)', () => {
    expect(clientIpFromHeaders({ 'x-forwarded-for': ['203.0.113.7', '10.0.0.1'] })).toBe('203.0.113.7')
  })
})

describe('decideInside', () => {
  const resolved = {
    'somjai.dyndns.org': ['203.0.113.7'],
    'branch.example.com': ['198.51.100.9', '2001:db8::9'],
  }

  it('IP ผู้ใช้ตรงกับที่ resolve ได้ → อยู่ในเครือข่ายบริษัท และบอกว่าตรงกับโฮสต์ไหน', () => {
    expect(decideInside('203.0.113.7', resolved)).toEqual({ inside: true, matched: 'somjai.dyndns.org' })
    expect(decideInside('2001:DB8::9', resolved)).toEqual({ inside: true, matched: 'branch.example.com' })
  })

  it('IP ผู้ใช้ไม่ตรง (เน็ตบ้าน / Hotspot) → นอกเครือข่าย', () => {
    expect(decideInside('192.0.2.44', resolved)).toEqual({ inside: false, matched: null })
  })

  it('ไม่รู้ IP ผู้ใช้ หรือ resolve ไม่ได้เลย → ถือว่านอกเครือข่าย (ปลอดภัยไว้ก่อน)', () => {
    expect(decideInside(null, resolved).inside).toBe(false)
    expect(decideInside('203.0.113.7', {}).inside).toBe(false)
  })
})
