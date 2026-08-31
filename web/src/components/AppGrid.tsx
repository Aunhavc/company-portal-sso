import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { AppCard } from './AppCard'
import type { AppEntry, HealthResult, NetworkZone } from '../lib/types'
import { cx } from '../lib/ui'

type Filter = 'all' | NetworkZone

interface Props {
  apps: AppEntry[]
  loading: boolean
  error: string | null
  health: Record<number, HealthResult>
  isAdmin: boolean
  onOpen: (app: AppEntry) => void
  onRefresh: () => void
}

const FILTERS: Array<{ key: Filter; label: string }> = [
  { key: 'all', label: 'ทั้งหมด' },
  { key: 'internet', label: 'ระบบบนคลาวด์' },
  { key: 'intranet', label: 'ระบบภายใน (VPN)' },
]

export function AppGrid({ apps, loading, error, health, isAdmin, onOpen, onRefresh }: Props) {
  const [filter, setFilter] = useState<Filter>('all')
  const [query, setQuery] = useState('')

  const groups = useMemo(() => {
    const q = query.trim().toLowerCase()
    const filtered = apps.filter((a) => {
      if (filter !== 'all' && a.network !== filter) return false
      if (!q) return true
      return (
        a.name.toLowerCase().includes(q) ||
        (a.description ?? '').toLowerCase().includes(q) ||
        a.category.toLowerCase().includes(q) ||
        a.slug.toLowerCase().includes(q)
      )
    })
    const map = new Map<string, AppEntry[]>()
    for (const app of filtered) {
      const list = map.get(app.category) ?? []
      list.push(app)
      map.set(app.category, list)
    }
    return [...map.entries()]
  }, [apps, filter, query])

  const total = groups.reduce((n, [, list]) => n + list.length, 0)

  return (
    <section aria-labelledby="apps-heading">
      <div className="mb-5 flex flex-wrap items-center gap-3">
        <h2 id="apps-heading" className="text-base font-semibold text-slate-900">
          ระบบงานทั้งหมด
        </h2>

        <div className="flex rounded-lg bg-slate-100 p-0.5">
          {FILTERS.map((f) => (
            <button
              key={f.key}
              type="button"
              onClick={() => setFilter(f.key)}
              className={cx(
                'rounded-md px-3 py-1.5 text-xs font-semibold transition',
                filter === f.key ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700',
              )}
            >
              {f.label}
            </button>
          ))}
        </div>

        <div className="ml-auto flex items-center gap-2">
          <label className="relative">
            <span className="sr-only">ค้นหาระบบงาน</span>
            <svg
              viewBox="0 0 20 20"
              className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
              fill="none" stroke="currentColor" strokeWidth="2"
            >
              <circle cx="9" cy="9" r="5.5" />
              <path d="M13.5 13.5L17 17" strokeLinecap="round" />
            </svg>
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="ค้นหา…"
              className="w-40 rounded-lg border border-slate-200 bg-white py-1.5 pl-8 pr-3 text-sm outline-none transition placeholder:text-slate-400 focus:border-blue-400 focus:ring-2 focus:ring-blue-100 sm:w-52"
            />
          </label>

          <button
            type="button"
            onClick={onRefresh}
            title="ตรวจสอบสถานะอีกครั้ง"
            className="rounded-lg border border-slate-200 bg-white p-2 text-slate-500 transition hover:bg-slate-50 hover:text-slate-700"
          >
            <svg viewBox="0 0 20 20" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8">
              <path d="M16 10a6 6 0 1 1-1.8-4.3M16 3v3h-3" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>

          {isAdmin ? (
            <Link
              to="/admin/apps"
              className="inline-flex items-center gap-1.5 rounded-lg bg-slate-900 px-3 py-2 text-xs font-semibold text-white transition hover:bg-slate-700"
            >
              <svg viewBox="0 0 20 20" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2.2">
                <path d="M10 4v12M4 10h12" strokeLinecap="round" />
              </svg>
              เพิ่มแอป
            </Link>
          ) : null}
        </div>
      </div>

      {loading ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="h-40 animate-pulse rounded-2xl bg-slate-100" />
          ))}
        </div>
      ) : error ? (
        <p className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">{error}</p>
      ) : total === 0 ? (
        <EmptyState isAdmin={isAdmin} filtered={apps.length > 0} />
      ) : (
        <div className="space-y-8">
          {groups.map(([category, list]) => (
            <div key={category}>
              <h3 className="mb-3 text-xs font-bold uppercase tracking-wider text-slate-400">
                {category}
              </h3>
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                {list.map((app) => (
                  <AppCard key={app.id} app={app} health={health[app.id]} onOpen={onOpen} />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  )
}

function EmptyState({ isAdmin, filtered }: { isAdmin: boolean; filtered: boolean }) {
  return (
    <div className="rounded-2xl border border-dashed border-slate-300 bg-white/60 p-10 text-center">
      <p className="text-3xl">🗂️</p>
      <p className="mt-3 text-sm font-semibold text-slate-700">
        {filtered ? 'ไม่พบระบบงานที่ตรงกับเงื่อนไข' : 'ยังไม่มีระบบงานในทะเบียน'}
      </p>
      <p className="mt-1 text-sm text-slate-500">
        {filtered ? 'ลองเปลี่ยนคำค้นหรือตัวกรอง' : 'เพิ่มแอปแรกเพื่อให้พนักงานเข้าใช้งานได้จากหน้านี้'}
      </p>
      {isAdmin && !filtered ? (
        <Link
          to="/admin/apps"
          className="mt-4 inline-block rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-700"
        >
          เพิ่มแอปแรก
        </Link>
      ) : null}
    </div>
  )
}
