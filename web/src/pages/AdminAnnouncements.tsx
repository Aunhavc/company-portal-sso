import { useState } from 'react'
import { AnnouncementFormModal } from '../components/AnnouncementFormModal'
import { useAllAnnouncements } from '../hooks/usePortalData'
import { api } from '../lib/api'
import { draftCount, sortAnnouncements } from '../lib/announcements'
import { CATEGORY_BADGE, CATEGORY_LABEL, cx, formatDate } from '../lib/ui'
import type { Announcement, AnnouncementInput } from '../lib/types'

export function AdminAnnouncements() {
  const { data: announcements, loading, error, reload } = useAllAnnouncements()
  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<Announcement | null>(null)
  const [saving, setSaving] = useState(false)
  const [notice, setNotice] = useState<{ kind: 'ok' | 'err'; text: string } | null>(null)

  function openNew() {
    setEditing(null)
    setFormOpen(true)
  }

  function openEdit(item: Announcement) {
    setEditing(item)
    setFormOpen(true)
  }

  async function submit(input: AnnouncementInput) {
    setSaving(true)
    setNotice(null)
    try {
      if (editing) {
        await api.updateAnnouncement(editing.id, input)
        setNotice({ kind: 'ok', text: `บันทึกการแก้ไข "${input.title}" แล้ว` })
      } else {
        await api.createAnnouncement(input)
        setNotice({ kind: 'ok', text: `เพิ่มประกาศ "${input.title}" แล้ว` })
      }
      setFormOpen(false)
      await reload()
    } catch (e) {
      setNotice({ kind: 'err', text: e instanceof Error ? e.message : String(e) })
    } finally {
      setSaving(false)
    }
  }

  async function remove(item: Announcement) {
    if (!window.confirm(`ลบประกาศ "${item.title}" ถาวร?`)) return
    try {
      await api.deleteAnnouncement(item.id)
      setNotice({ kind: 'ok', text: `ลบ "${item.title}" แล้ว` })
      await reload()
    } catch (e) {
      setNotice({ kind: 'err', text: e instanceof Error ? e.message : String(e) })
    }
  }

  const rows = sortAnnouncements(announcements)
  const drafts = draftCount(announcements)

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="text-2xl font-bold text-slate-900">จัดการประกาศ</h1>
        <div className="flex-1" />
        <button
          type="button"
          onClick={reload}
          className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
        >
          รีเฟรช
        </button>
        <button
          type="button"
          onClick={openNew}
          className="rounded-lg bg-blue-600 px-4 py-1.5 text-sm font-semibold text-white hover:bg-blue-700"
        >
          + เพิ่มประกาศ
        </button>
      </div>

      <p className="mt-2 max-w-3xl text-sm leading-relaxed text-slate-600">
        ประกาศที่ติ๊ก "เผยแพร่" จะไปแสดงบนหน้าหลักทันที ส่วนฉบับร่างจะเห็นเฉพาะในหน้านี้
        {drafts > 0 ? ` — ตอนนี้มี ${drafts} รายการเป็นฉบับร่าง` : ''}
      </p>

      {notice ? (
        <p
          className={cx(
            'mt-4 rounded-xl border p-3 text-sm',
            notice.kind === 'ok'
              ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
              : 'border-rose-200 bg-rose-50 text-rose-700',
          )}
        >
          {notice.text}
        </p>
      ) : null}

      {error ? (
        <p className="mt-4 rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">
          {error}
        </p>
      ) : null}

      {loading ? (
        <p className="mt-8 text-sm text-slate-500">กำลังโหลด…</p>
      ) : rows.length === 0 ? (
        <div className="mt-8 rounded-2xl border border-dashed border-slate-300 p-10 text-center">
          <p className="text-sm text-slate-500">ยังไม่มีประกาศ</p>
          <button
            type="button"
            onClick={openNew}
            className="mt-4 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
          >
            เพิ่มประกาศแรก
          </button>
        </div>
      ) : (
        <div className="mt-5 space-y-3">
          {rows.map((item) => (
            <div
              key={item.id}
              className={cx(
                'rounded-2xl border bg-white p-4',
                item.published ? 'border-slate-200' : 'border-dashed border-slate-300 bg-slate-50/60',
              )}
            >
              <div className="flex flex-wrap items-start gap-3">
                <span
                  className={cx(
                    'rounded-full px-2.5 py-1 text-xs font-semibold ring-1',
                    CATEGORY_BADGE[item.category],
                  )}
                >
                  {CATEGORY_LABEL[item.category]}
                </span>
                {item.is_pinned ? (
                  <span className="rounded-full bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-700 ring-1 ring-amber-200">
                    📌 ปักหมุด
                  </span>
                ) : null}
                {!item.published ? (
                  <span className="rounded-full bg-slate-200 px-2.5 py-1 text-xs font-semibold text-slate-600">
                    ฉบับร่าง
                  </span>
                ) : null}
                <div className="flex-1" />
                <button
                  type="button"
                  onClick={() => openEdit(item)}
                  className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                >
                  แก้ไข
                </button>
                <button
                  type="button"
                  onClick={() => void remove(item)}
                  className="rounded-lg border border-rose-300 px-3 py-1.5 text-xs font-semibold text-rose-700 hover:bg-rose-50"
                >
                  ลบ
                </button>
              </div>
              <p className="mt-3 text-sm font-semibold text-slate-900">{item.title}</p>
              <p className="mt-1 line-clamp-2 text-sm text-slate-500">{item.content}</p>
              <p className="mt-2 text-xs text-slate-400">{formatDate(item.published_at)}</p>
            </div>
          ))}
        </div>
      )}

      <AnnouncementFormModal
        open={formOpen}
        editing={editing}
        saving={saving}
        onClose={() => setFormOpen(false)}
        onSubmit={(input) => void submit(input)}
      />
    </div>
  )
}
