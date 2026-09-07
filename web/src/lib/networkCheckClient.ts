import { parseHostList, type NetworkCheckResult } from './networkCheck'

const DEFAULT_TIMEOUT_MS = 8000

/**
 * เรียก GET /api/network-check ให้ตอบว่าผู้ใช้อยู่ในเครือข่ายบริษัทไหม
 * โยน Error เมื่อเรียกไม่สำเร็จ / หมดเวลา — ผู้เรียกต้องแยกกรณี "ตรวจไม่ได้" ออกจาก "อยู่นอกเครือข่าย"
 */
export async function checkCompanyNetwork(
  hostsRaw: string,
  { timeoutMs = DEFAULT_TIMEOUT_MS, fetchFn = fetch }: { timeoutMs?: number; fetchFn?: typeof fetch } = {},
): Promise<NetworkCheckResult> {
  const hosts = parseHostList(hostsRaw)
  if (hosts.length === 0) throw new Error('ยังไม่ได้ตั้งค่าชื่อ DynDNS / IP ของบริษัท')

  const ctrl = new AbortController()
  const timer = setTimeout(() => ctrl.abort(), timeoutMs)
  try {
    const res = await fetchFn(`/api/network-check?host=${encodeURIComponent(hosts.join(','))}`, {
      signal: ctrl.signal,
      cache: 'no-store',
    })
    if (!res.ok) throw new Error(`ตรวจสอบเครือข่ายไม่สำเร็จ (HTTP ${res.status})`)
    return (await res.json()) as NetworkCheckResult
  } finally {
    clearTimeout(timer)
  }
}
