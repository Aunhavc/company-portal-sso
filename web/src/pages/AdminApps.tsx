import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { AppFormModal } from '../components/AppFormModal'
import { DemoBanner } from '../components/DemoBanner'
import { useAllApps } from '../hooks/usePortalData'
import { api } from '../lib/api'
import { ACCENTS, cx } from '../lib/ui'
import type { AppEntry, AppInput } from '../lib/types'

export function AdminApps() {
  const { data: apps, loading, error, reload } = useAllApps()
  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<AppEntry | null>(null)
  const [saving, setSaving] = useState(false)
  const [notice, setNotice] = useState<{ kind: 'ok' | 'err'; text: string } | null>(null)

  const categories = useMemo(
    () => [...new Set(apps.map((a) => a.category))].sort((a, b) => a.localeCompare(b, 'th')),
    [apps],
  )

  function openNew() {
    setEditing(null)
    setFormOpen(true)
  }

  function openEdit(app: AppEntry) {
    setEditing(app)
    setFormOpen(true)
  }

  async function submit(input: AppInput) {
    setSaving(true)
    setNotice(null)
    try {
      if (editing) {
        await api.updateApp(editing.id, input)
        setNotice({ kind: 'ok', text: `บันทึกการแก้ไข "${input.name}" แล้ว` })
      } else {
        await api.createApp(input)
        setNotice({ kind: 'ok', text: `เพิ่ม "${input.name}" เข้าทะเบียนแล้ว` })
      }
      setFormOpen(false)
      await reload()
    } catch (e) {
      setNotice({ kind: 'err', text: e instanceof Error ? e.message : String(e) })
    } finally {
      setSaving(false)
    }
  }

  async function remove(app: AppEntry) {
    if (!window.confirm(`ลบ "${app.name}" ออกจากทะเบียนถาวร?\n\nหากต้องการแค่ซ่อนจากหน้าหลัก ให้แก้ไขแล้วปิด "เปิดใช้งาน" แทน`)) {
      return
    }
    try {
      await api.deleteApp(app.id)
      setNotice({ kind: 'ok', text: `ลบ "${app.name}" แล้ว` })
      await reload()
    } catch (e) {
      setNotice({ kind: 'err', text: e instanceof Error ? e.message : String(e) })
    }
  }

  async function toggleActive(app: AppEntry) {
    const { id: _id, created_at: _c, updated_at: _u, ...rest } = app
    try {
      await api.updateApp(app.id, { ...rest, is_active: !app.is_active })
      await reload()
    } catch (e) {
      setNotice({ kind: 'err', text: e instanceof Error ? e.message : String(e) })
    }
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <DemoBanner />

      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <nav className="mb-1 text-sm text-slate-400">
            <Link to="/" className="transition hover:text-slate-600">
              หน้าหลัก
            </Link>
            <span className="mx-1.5">/</span>
            <span className="text-slate-600">จัดการแอป</span>
          </nav>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">ทะเบียนระบบงาน</h1>
          <p className="mt-1 text-sm text-slate-500">
            เพิ่ม แก้ไข หรือซ่อนระบบงานที่แสดงบนหน้าหลัก — มีผลกับพนักงานทุกคนทันที
          </p>
        </div>

        <button
          type="button"
          onClick={openNew}
          className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700"
        >
          <svg viewBox="0 0 20 20" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2.4">
            <path d="M10 4v12M4 10h12" strokeLinecap="round" />
          </svg>
          เพิ่มแอปใหม่
        </button>
      </div>

      {notice ? (
        <div
          className={cx(
            'mb-5 rounded-xl border p-3 text-sm',
            notice.kind === 'ok'
              ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
              : 'border-rose-200 bg-rose-50 text-rose-800',
          )}
        >
          {notice.text}
        </div>
      ) : null}

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        {loading ? (
          <div className="space-y-2 p-4">
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className="h-14 animate-pulse rounded-lg bg-slate-100" />
            ))}
          </div>
        ) : error ? (
          <p className="p-6 text-sm text-rose-700">{error}</p>
        ) : apps.length === 0 ? (
          <div className="p-12 text-center">
            <p className="text-3xl">🗂️</p>
            <p className="mt-3 text-sm font-semibold text-slate-700">ยังไม่มีระบบงานในทะเบียน</p>
            <button
              type="button"
              onClick={openNew}
              className="mt-4 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-700"
            >
              เพิ่มแอปแรก
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[52rem] text-left text-sm">
              <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase tracking-wider text-slate-500">
                <tr>
                  <th className="px-4 py-3 font-semibold">แอป</th>
                  <th className="px-4 py-3 font-semibold">หมวดหมู่</th>
                  <th className="px-4 py-3 font-semibold">เครือข่าย</th>
                  <th className="px-4 py-3 font-semibold">สิทธิ์</th>
                  <th className="px-4 py-3 text-center font-semibold">ลำดับ</th>
                  <th className="px-4 py-3 text-center font-semibold">สถานะ</th>
                  <th className="px-4 py-3 text-right font-semibold">จัดการ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {apps.map((app) => (
                  <tr key={app.id} className={cx('transition hover:bg-slate-50', !app.is_active && 'opacity-55')}>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <span className={cx('grid h-9 w-9 shrink-0 place-items-center rounded-lg text-lg', ACCENTS[app.accent].tile)}>
                          {app.icon}
                        </span>
                        <div className="min-w-0">
                          <p className="truncate font-semibold text-slate-900">{app.name}</p>
                          <p className="truncate text-xs text-slate-400">{app.url}</p>
                        </div>
                      </div>
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-slate-600">{app.category}</td>
                    <td className="whitespace-nowrap px-4 py-3">
                      <span
                        className={cx(
                          'rounded-full px-2 py-0.5 text-[11px] font-semibold ring-1 ring-inset',
                          app.network === 'intranet'
                            ? 'bg-emerald-50 text-emerald-700 ring-emerald-200'
                            : 'bg-blue-50 text-blue-700 ring-blue-200',
                        )}
                      >
                        {app.network === 'intranet' ? 'ภายใน (VPN)' : 'คลาวด์'}
                      </span>
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-xs text-slate-500">
                      {app.allowed_roles.includes('user') ? 'ทุกคน' : 'เฉพาะผู้ดูแล'}
                    </td>
                    <td className="px-4 py-3 text-center text-slate-500">{app.sort_order}</td>
                    <td className="px-4 py-3 text-center">
                      <button
                        type="button"
                        onClick={() => void toggleActive(app)}
                        title={app.is_active ? 'คลิกเพื่อซ่อน' : 'คลิกเพื่อแสดง'}
                        className={cx(
                          'inline-flex h-6 w-11 items-center rounded-full px-0.5 transition',
                          app.is_active ? 'bg-emerald-500' : 'bg-slate-300',
                        )}
                      >
                        <span
                          className={cx(
                            'h-5 w-5 rounded-full bg-white shadow transition',
                            app.is_active && 'translate-x-5',
                          )}
                        />
                      </button>
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-right">
                      <button
                        type="button"
                        onClick={() => openEdit(app)}
                        className="rounded-lg px-3 py-1.5 text-sm font-medium text-blue-600 transition hover:bg-blue-50"
                      >
                        แก้ไข
                      </button>
                      <button
                        type="button"
                        onClick={() => void remove(app)}
                        className="rounded-lg px-3 py-1.5 text-sm font-medium text-rose-600 transition hover:bg-rose-50"
                      >
                        ลบ
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <AppFormModal
        open={formOpen}
        editing={editing}
        categories={categories}
        saving={saving}
        onClose={() => setFormOpen(false)}
        onSubmit={(input) => void submit(input)}
      />
    </div>
  )
}
