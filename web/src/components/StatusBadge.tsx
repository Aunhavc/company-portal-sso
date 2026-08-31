import type { HealthResult, NetworkZone } from '../lib/types'
import { cx } from '../lib/ui'

const STYLES: Record<string, { dot: string; chip: string; label: string }> = {
  online:   { dot: 'bg-emerald-500', chip: 'bg-emerald-50 text-emerald-700 ring-emerald-200', label: 'เชื่อมต่อแล้ว' },
  offline:  { dot: 'bg-slate-400',   chip: 'bg-slate-100 text-slate-600 ring-slate-200',      label: 'ยังไม่ได้ต่อ VPN' },
  blocked:  { dot: 'bg-amber-500',   chip: 'bg-amber-50 text-amber-800 ring-amber-200',        label: 'ตรวจสอบไม่ได้' },
  checking: { dot: 'bg-blue-400 animate-pulse', chip: 'bg-blue-50 text-blue-700 ring-blue-200', label: 'กำลังตรวจสอบ' },
  unknown:  { dot: 'bg-slate-300',   chip: 'bg-slate-50 text-slate-500 ring-slate-200',        label: 'ไม่ทราบสถานะ' },
  internet: { dot: 'bg-blue-500',    chip: 'bg-blue-50 text-blue-700 ring-blue-200',           label: 'ใช้งานได้ทุกที่' },
}

export function StatusBadge({
  network,
  health,
}: {
  network: NetworkZone
  health?: HealthResult
}) {
  // แอปฝั่งอินเทอร์เน็ตที่ไม่ได้ตั้ง health_url — ไม่ต้อง probe
  const key = network === 'internet' && !health ? 'internet' : (health?.state ?? 'unknown')
  const style = STYLES[key] ?? STYLES.unknown

  return (
    <span
      className={cx(
        'inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold ring-1 ring-inset',
        style.chip,
      )}
      title={health?.reason}
    >
      <span className={cx('h-1.5 w-1.5 rounded-full', style.dot)} />
      {style.label}
      {health?.state === 'online' && health.latencyMs !== undefined ? (
        <span className="font-normal opacity-70">{health.latencyMs} ms</span>
      ) : null}
    </span>
  )
}
