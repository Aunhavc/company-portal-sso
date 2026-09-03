import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { Modal } from './Modal'
import { cx } from '../lib/ui'
import { sortCategories, toLocalInputValue, fromLocalInputValue, validateAnnouncement } from '../lib/announcements'
import type { Announcement, AnnouncementCategoryEntry, AnnouncementInput } from '../lib/types'

/**
 * ฟอร์มเพิ่ม/แก้ไขประกาศ — ใช้ตัวเดียวกันทั้งสองกรณี เหมือนรูปแบบของ AppFormModal
 */

const EMPTY: AnnouncementInput = {
  title: '',
  content: '',
  category: '',
  is_pinned: false,
  published: true,
  starts_at: null,
  ends_at: null,
}

interface Props {
  open: boolean
  editing: Announcement | null
  categories: AnnouncementCategoryEntry[]
  saving: boolean
  onClose: () => void
  onSubmit: (input: AnnouncementInput) => void
}

export function AnnouncementFormModal({
  open,
  editing,
  categories,
  saving,
  onClose,
  onSubmit,
}: Props) {
  const [form, setForm] = useState<AnnouncementInput>(EMPTY)
  /** ช่องที่ผู้ใช้แตะแล้ว — ใช้กันไม่ให้ขึ้นข้อความแดงตั้งแต่ยังไม่ได้กรอกอะไรเลย */
  const [touched, setTouched] = useState<Partial<Record<keyof AnnouncementInput, boolean>>>({})
  const [submitAttempted, setSubmitAttempted] = useState(false)

  const sortedCategories = useMemo(() => sortCategories(categories), [categories])

  useEffect(() => {
    if (!open) return
    setTouched({})
    setSubmitAttempted(false)
    if (editing) {
      const { title, content, category, is_pinned, published, starts_at, ends_at } = editing
      setForm({ title, content, category, is_pinned, published, starts_at, ends_at })
    } else {
      setForm({ ...EMPTY, category: sortedCategories[0]?.key ?? '' })
    }
  }, [open, editing, sortedCategories])

  const set = <K extends keyof AnnouncementInput>(key: K, value: AnnouncementInput[K]) => {
    setTouched((t) => (t[key] ? t : { ...t, [key]: true }))
    setForm((f) => ({ ...f, [key]: value }))
  }

  const errors = useMemo(() => validateAnnouncement(form), [form])
  const valid = Object.keys(errors).length === 0

  const errorOf = (key: keyof typeof errors) =>
    submitAttempted || touched[key] ? errors[key] : undefined

  const submit = () => {
    setSubmitAttempted(true)
    if (!valid) return
    onSubmit({ ...form, title: form.title.trim(), content: form.content.trim() })
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={editing ? 'แก้ไขประกาศ' : 'เพิ่มประกาศใหม่'}
      subtitle="ประกาศที่เผยแพร่จะไปแสดงบนหน้าหลักให้พนักงานทันทีหลังบันทึก"
      footer={
        <>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg px-4 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-100"
          >
            ยกเลิก
          </button>
          <button
            type="button"
            disabled={saving}
            onClick={submit}
            className={cx(
              'rounded-lg px-5 py-2 text-sm font-semibold text-white shadow-sm transition',
              valid ? 'bg-blue-600 hover:bg-blue-700' : 'bg-slate-300',
              saving && 'cursor-not-allowed opacity-60',
            )}
          >
            {saving ? 'กำลังบันทึก…' : editing ? 'บันทึกการแก้ไข' : 'เพิ่มประกาศ'}
          </button>
        </>
      }
    >
      <div className="space-y-5">
        <Field label="หัวข้อ" error={errorOf('title')} required>
          <input
            className={inputCls}
            value={form.title}
            placeholder="เช่น แจ้งปรับปรุงระบบ VPN ประจำเดือน"
            onChange={(e) => set('title', e.target.value)}
          />
        </Field>

        <Field label="เนื้อหา" error={errorOf('content')} required>
          <textarea
            className={cx(inputCls, 'min-h-[9rem] resize-y')}
            value={form.content}
            placeholder="รายละเอียดประกาศ"
            onChange={(e) => set('content', e.target.value)}
          />
        </Field>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field
            label="หมวดหมู่"
            error={errorOf('category')}
            hint={sortedCategories.length === 0 ? 'ยังไม่มีหมวดหมู่ — เพิ่มก่อนที่การ์ดด้านบน' : undefined}
          >
            <select
              className="h-9 w-full rounded-lg border border-slate-300 bg-white px-2 text-sm text-slate-900"
              value={form.category}
              disabled={sortedCategories.length === 0}
              onChange={(e) => set('category', e.target.value)}
            >
              {sortedCategories.map((c) => (
                <option key={c.key} value={c.key}>
                  {c.label}
                </option>
              ))}
            </select>
          </Field>

          <div className="flex flex-col justify-end gap-2 pb-1">
            <label className="flex items-center gap-2 text-sm text-slate-700">
              <input
                type="checkbox"
                checked={form.is_pinned}
                onChange={(e) => set('is_pinned', e.target.checked)}
              />
              ปักหมุดขึ้นบนสุด
            </label>
            <label className="flex items-center gap-2 text-sm text-slate-700">
              <input
                type="checkbox"
                checked={form.published}
                onChange={(e) => set('published', e.target.checked)}
              />
              เผยแพร่ให้พนักงานเห็นทันที
            </label>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="วันเริ่มแสดง" hint="ปล่อยว่าง = แสดงทันทีที่เผยแพร่">
            <input
              type="datetime-local"
              className={inputCls}
              value={toLocalInputValue(form.starts_at)}
              onChange={(e) => set('starts_at', fromLocalInputValue(e.target.value))}
            />
          </Field>

          <Field label="วันสิ้นสุด" error={errorOf('ends_at')} hint="ปล่อยว่าง = ไม่มีวันหมดอายุ">
            <input
              type="datetime-local"
              className={inputCls}
              value={toLocalInputValue(form.ends_at)}
              onChange={(e) => set('ends_at', fromLocalInputValue(e.target.value))}
            />
          </Field>
        </div>
        <p className="-mt-3 text-xs text-slate-400">
          พ้นวันสิ้นสุดแล้ว ประกาศจะหายไปจากหน้าหลักเองโดยอัตโนมัติ ไม่ต้องมาลบทีหลัง
        </p>
      </div>
    </Modal>
  )
}

const inputCls =
  'w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-400 focus:ring-2 focus:ring-blue-100'

function Field({
  label,
  hint,
  error,
  required,
  children,
}: {
  label: string
  hint?: string
  error?: string
  required?: boolean
  children: ReactNode
}) {
  return (
    <div>
      <label className="mb-1.5 block text-sm font-medium text-slate-700">
        {label}
        {required ? <span className="ml-0.5 text-rose-500">*</span> : null}
      </label>
      {children}
      {error ? (
        <p className="mt-1 text-xs text-rose-600">{error}</p>
      ) : hint ? (
        <p className="mt-1 text-xs text-slate-400">{hint}</p>
      ) : null}
    </div>
  )
}
