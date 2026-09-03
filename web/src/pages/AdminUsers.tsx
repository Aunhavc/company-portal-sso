import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import { api } from '../lib/api'
import { useSession } from '../lib/session'
import {
  IDENTITY_LABEL,
  blockReason,
  identitySource,
  pendingCount,
  sortProfiles,
} from '../lib/users'
import type { Profile, UserRole } from '../lib/types'

type Tab = 'pending' | 'all'

export function AdminUsers() {
  const { profile: me } = useSession()
  const [rows, setRows] = useState<Profile[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [busyId, setBusyId] = useState<string | null>(null)
  const [tab, setTab] = useState<Tab>('pending')

  const load = useCallback(() => {
    setLoading(true)
    api
      .listProfiles()
      .then((list) => {
        setRows(list)
        setError(null)
      })
      .catch((e: unknown) => setError(e instanceof Error ? e.message : String(e)))
      .finally(() => setLoading(false))
  }, [])

  useEffect(load, [load])

  const pending = pendingCount(rows)
  const visible = useMemo(() => {
    const sorted = sortProfiles(rows)
    return tab === 'pending' ? sorted.filter((p) => !p.is_active) : sorted
  }, [rows, tab])

  // ถ้าไม่มีใครรออนุมัติ ให้เด้งไปแท็บทั้งหมด จะได้ไม่เจอหน้าว่างเปล่าโดยไม่จำเป็น
  useEffect(() => {
    if (!loading && pending === 0) setTab('all')
  }, [loading, pending])

  async function apply(target: Profile, change: { role?: UserRole; is_active?: boolean }) {
    const reason = blockReason(target, change, rows, me?.id ?? '')
    if (reason) {
      setError(reason)
      return
    }
    setBusyId(target.id)
    setError(null)
    try {
      const updated = await api.updateProfile(target.id, change)
      setRows((prev) => prev.map((p) => (p.id === updated.id ? updated : p)))
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setBusyId(null)
    }
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="text-2xl font-bold text-slate-900">จัดการผู้ใช้</h1>
        <div className="flex-1" />
        <button
          type="button"
          onClick={load}
          className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
        >
          รีเฟรช
        </button>
      </div>

      <p className="mt-2 max-w-3xl text-sm leading-relaxed text-slate-600">
        พนักงานที่เข้าด้วย <strong>บัญชีพนักงาน (AD)</strong> ใช้งานได้ทันที
        ส่วนผู้ที่เข้าด้วยช่องทางอื่นต้องได้รับการอนุมัติจากผู้ดูแลก่อนจึงจะเห็นข้อมูลใด ๆ
      </p>

      <div className="mt-5 flex gap-2">
        <TabButton active={tab === 'pending'} onClick={() => setTab('pending')}>
          {pending > 0 ? `รออนุมัติ (${pending})` : 'รออนุมัติ'}
        </TabButton>
        <TabButton active={tab === 'all'} onClick={() => setTab('all')}>
          {`ทั้งหมด (${rows.length})`}
        </TabButton>
      </div>

      {error ? (
        <p className="mt-4 rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">
          {error}
        </p>
      ) : null}

      {loading ? (
        <p className="mt-8 text-sm text-slate-500">กำลังโหลด…</p>
      ) : visible.length === 0 ? (
        <p className="mt-8 rounded-2xl border border-dashed border-slate-300 p-10 text-center text-sm text-slate-500">
          {tab === 'pending' ? 'ไม่มีผู้ใช้ที่รออนุมัติ' : 'ยังไม่มีผู้ใช้ในระบบ'}
        </p>
      ) : (
        <div className="mt-5 overflow-x-auto rounded-2xl border border-slate-200 bg-white">
          <table className="w-full min-w-[56rem] text-sm">
            <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-4 py-3">ผู้ใช้</th>
                <th className="px-4 py-3">ช่องทางเข้าระบบ</th>
                <th className="px-4 py-3">สิทธิ์</th>
                <th className="px-4 py-3">สถานะ</th>
                <th className="px-4 py-3 text-right">การจัดการ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {visible.map((p) => {
                const isSelf = p.id === (me?.id ?? '')
                const busy = busyId === p.id
                return (
                  <tr key={p.id} className={p.is_active ? '' : 'bg-amber-50/50'}>
                    <td className="px-4 py-3">
                      <p className="font-medium text-slate-900">{p.full_name ?? '—'}</p>
                      <p className="text-xs text-slate-500">{p.email}</p>
                    </td>
                    <td className="px-4 py-3 text-slate-600">
                      {IDENTITY_LABEL[identitySource(p.id)]}
                    </td>
                    <td className="px-4 py-3">
                      <select
                        value={p.role}
                        disabled={isSelf || busy}
                        onChange={(e) => void apply(p, { role: e.target.value as UserRole })}
                        className="rounded-lg border border-slate-300 px-2 py-1 text-sm disabled:opacity-50"
                      >
                        <option value="user">พนักงาน</option>
                        <option value="admin">ผู้ดูแลระบบ</option>
                      </select>
                    </td>
                    <td className="px-4 py-3">
                      {p.is_active ? (
                        <span className="rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-semibold text-emerald-800">
                          ใช้งานได้
                        </span>
                      ) : (
                        <span className="rounded-full bg-amber-100 px-2.5 py-1 text-xs font-semibold text-amber-800">
                          รออนุมัติ
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">
                      {isSelf ? (
                        <span className="text-xs text-slate-400">บัญชีของคุณ</span>
                      ) : p.is_active ? (
                        <button
                          type="button"
                          disabled={busy}
                          onClick={() => void apply(p, { is_active: false })}
                          className="rounded-lg border border-rose-300 px-3 py-1.5 text-xs font-semibold text-rose-700 hover:bg-rose-50 disabled:opacity-50"
                        >
                          ระงับการใช้งาน
                        </button>
                      ) : (
                        <button
                          type="button"
                          disabled={busy}
                          onClick={() => void apply(p, { is_active: true })}
                          className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700 disabled:opacity-50"
                        >
                          อนุมัติ
                        </button>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

function TabButton({
  active,
  onClick,
  children,
}: {
  active: boolean
  onClick: () => void
  children: ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={
        active
          ? 'rounded-lg bg-slate-900 px-3 py-1.5 text-sm font-semibold text-white'
          : 'rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-600 hover:bg-slate-50'
      }
    >
      {children}
    </button>
  )
}
