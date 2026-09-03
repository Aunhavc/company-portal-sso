import { useState } from 'react'
import { deriveCategoryKey, sortCategories, validateCategory } from '../lib/announcements'
import { ACCENT_OPTIONS, ACCENT_SWATCH, cx } from '../lib/ui'
import type { AccentColor, AnnouncementCategoryEntry } from '../lib/types'

/**
 * แผงจัดการหมวดหมู่ประกาศ — เพิ่ม/แก้ไข/ลบ อยู่ในการ์ดเดียวกัน แก้ทีละแถวได้เลย
 * ไม่ต้องเปิดหน้าต่างแยก ให้เป็นไปตามคำขอ "จัดการง่าย"
 */

interface Props {
  categories: AnnouncementCategoryEntry[]
  onCreate: (key: string, label: string, color: AccentColor) => Promise<void>
  onUpdate: (key: string, label: string, color: AccentColor) => Promise<void>
  onDelete: (key: string) => Promise<void>
}

export function AnnouncementCategoryManager({ categories, onCreate, onUpdate, onDelete }: Props) {
  const [open, setOpen] = useState(false)
  const rows = sortCategories(categories)

  return (
    <div className="mt-5 rounded-2xl border border-slate-200 bg-white">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between px-4 py-3 text-left"
      >
        <span className="text-sm font-semibold text-slate-900">
          จัดการหมวดหมู่ ({rows.length})
        </span>
        <span className="text-xs text-slate-400">{open ? 'ซ่อน ▲' : 'แสดง ▼'}</span>
      </button>

      {open ? (
        <div className="space-y-2 border-t border-slate-100 p-4">
          {rows.map((c) => (
            <CategoryRow
              key={c.key}
              category={c}
              onSave={(label, color) => onUpdate(c.key, label, color)}
              onDelete={() => onDelete(c.key)}
            />
          ))}
          <AddCategoryRow
            existingKeys={rows.map((c) => c.key)}
            onAdd={(label, color) =>
              onCreate(deriveCategoryKey(label, rows.map((c) => c.key)), label, color)
            }
          />
        </div>
      ) : null}
    </div>
  )
}

function CategoryRow({
  category,
  onSave,
  onDelete,
}: {
  category: AnnouncementCategoryEntry
  onSave: (label: string, color: AccentColor) => Promise<void>
  onDelete: () => Promise<void>
}) {
  const [label, setLabel] = useState(category.label)
  const [color, setColor] = useState<AccentColor>(category.color)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const dirty = label !== category.label || color !== category.color
  const validationError = validateCategory({ label }).label

  async function save() {
    if (validationError) return
    setBusy(true)
    setError(null)
    try {
      await onSave(label.trim(), color)
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setBusy(false)
    }
  }

  async function remove() {
    if (!window.confirm(`ลบหมวดหมู่ "${category.label}"?`)) return
    setBusy(true)
    setError(null)
    try {
      await onDelete()
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="rounded-xl border border-slate-200 p-3">
      <div className="flex flex-wrap items-center gap-2">
        <ColorPicker value={color} onChange={setColor} />
        <input
          className="h-9 min-w-0 flex-1 rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-900"
          value={label}
          onChange={(e) => setLabel(e.target.value)}
        />
        <button
          type="button"
          disabled={busy || !dirty || !!validationError}
          onClick={() => void save()}
          className="rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-slate-300"
        >
          บันทึก
        </button>
        <button
          type="button"
          disabled={busy}
          onClick={() => void remove()}
          className="rounded-lg border border-rose-300 px-3 py-1.5 text-xs font-semibold text-rose-700 hover:bg-rose-50 disabled:opacity-50"
        >
          ลบ
        </button>
      </div>
      {validationError ? <p className="mt-1 text-xs text-rose-600">{validationError}</p> : null}
      {error ? <p className="mt-1 text-xs text-rose-600">{error}</p> : null}
    </div>
  )
}

function AddCategoryRow({
  existingKeys,
  onAdd,
}: {
  existingKeys: string[]
  onAdd: (label: string, color: AccentColor) => Promise<void>
}) {
  const [label, setLabel] = useState('')
  const [color, setColor] = useState<AccentColor>('slate')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const validationError = validateCategory({ label }).label

  async function add() {
    if (validationError) return
    setBusy(true)
    setError(null)
    try {
      await onAdd(label.trim(), color)
      setLabel('')
      setColor('slate')
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="rounded-xl border border-dashed border-slate-300 p-3">
      <div className="flex flex-wrap items-center gap-2">
        <ColorPicker value={color} onChange={setColor} />
        <input
          className="h-9 min-w-0 flex-1 rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-900"
          value={label}
          placeholder="ชื่อหมวดหมู่ใหม่ เช่น ฝ่ายผลิต"
          onChange={(e) => setLabel(e.target.value)}
        />
        <button
          type="button"
          disabled={busy || !label.trim() || !!validationError}
          onClick={() => void add()}
          className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:bg-slate-300"
        >
          + เพิ่มหมวดหมู่
        </button>
      </div>
      {error ? <p className="mt-1 text-xs text-rose-600">{error}</p> : null}
      {existingKeys.length === 0 ? (
        <p className="mt-1 text-xs text-slate-400">ยังไม่มีหมวดหมู่เลย เพิ่มอันแรกได้ที่นี่</p>
      ) : null}
    </div>
  )
}

function ColorPicker({
  value,
  onChange,
}: {
  value: AccentColor
  onChange: (c: AccentColor) => void
}) {
  return (
    <div className="flex shrink-0 flex-wrap gap-1.5">
      {ACCENT_OPTIONS.map((c) => (
        <button
          key={c}
          type="button"
          aria-label={c}
          onClick={() => onChange(c)}
          className={cx(
            'h-6 w-6 rounded-full ring-offset-1 transition',
            ACCENT_SWATCH[c],
            value === c ? 'ring-2 ring-slate-900' : 'hover:ring-2 hover:ring-slate-300',
          )}
        />
      ))}
    </div>
  )
}
