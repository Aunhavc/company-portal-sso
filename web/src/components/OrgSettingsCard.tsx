import { useEffect, useRef, useState } from 'react'
import { useSettings, BrandMark } from '../lib/settings'
import { SETTING_LABELS, type Settings } from '../lib/types'
import { cx } from '../lib/ui'

/**
 * การ์ดตั้งค่าองค์กรบนหน้าจัดการแอป
 * แก้ชื่อบริษัท คำบรรยาย ข้อมูลติดต่อ และอัปโหลดโลโก้ได้โดยไม่ต้อง deploy ใหม่
 *
 * โลโก้เก็บเป็น data URI ในฐานข้อมูล จึงไม่ต้องตั้งค่าที่เก็บไฟล์แยก
 * ภาพจะถูกย่อให้ด้านยาวสุดไม่เกิน 256 พิกเซลก่อนบันทึก เพื่อไม่ให้แถวใหญ่เกินไป
 */

const MAX_UPLOAD_BYTES = 2 * 1024 * 1024   // 2 MB ก่อนย่อ
const MAX_SIDE = 256                        // พิกเซลด้านยาวสุดหลังย่อ
const MAX_STORED_BYTES = 300 * 1024         // ขนาดสูงสุดที่ยอมบันทึกลงฐานข้อมูล

/** ย่อรูปด้วย canvas แล้วคืนค่าเป็น data URI (ไฟล์ SVG คืนตามเดิมเพราะขยายได้ไม่เสียคุณภาพ) */
async function toDataUri(file: File): Promise<string> {
  const raw = await new Promise<string>((resolve, reject) => {
    const fr = new FileReader()
    fr.onload = () => resolve(String(fr.result))
    fr.onerror = () => reject(new Error('อ่านไฟล์ไม่สำเร็จ'))
    fr.readAsDataURL(file)
  })

  if (file.type === 'image/svg+xml') return raw

  const img = await new Promise<HTMLImageElement>((resolve, reject) => {
    const el = new Image()
    el.onload = () => resolve(el)
    el.onerror = () => reject(new Error('ไฟล์นี้ไม่ใช่รูปภาพที่เปิดได้'))
    el.src = raw
  })

  const scale = Math.min(1, MAX_SIDE / Math.max(img.width, img.height))
  const w = Math.max(1, Math.round(img.width * scale))
  const h = Math.max(1, Math.round(img.height * scale))

  const canvas = document.createElement('canvas')
  canvas.width = w
  canvas.height = h
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('เบราว์เซอร์นี้ย่อรูปไม่ได้')
  ctx.drawImage(img, 0, 0, w, h)
  return canvas.toDataURL('image/png')
}

export function OrgSettingsCard() {
  const { settings, save } = useSettings()
  const [form, setForm] = useState<Settings>(settings)
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState<{ kind: 'ok' | 'err'; text: string } | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  useEffect(() => setForm(settings), [settings])

  const dirty = JSON.stringify(form) !== JSON.stringify(settings)
  const set = <K extends keyof Settings>(k: K, v: Settings[K]) => setForm((f) => ({ ...f, [k]: v }))

  async function pickLogo(file: File | undefined) {
    if (!file) return
    setMsg(null)
    if (file.size > MAX_UPLOAD_BYTES) {
      setMsg({ kind: 'err', text: 'ไฟล์ใหญ่เกิน 2 MB กรุณาย่อขนาดก่อนอัปโหลด' })
      return
    }
    try {
      const uri = await toDataUri(file)
      if (uri.length > MAX_STORED_BYTES) {
        setMsg({ kind: 'err', text: 'รูปหลังย่อยังใหญ่เกินไป ลองใช้ไฟล์ PNG ที่มีพื้นหลังโปร่งใส' })
        return
      }
      set('logo_url', uri)
      setMsg({ kind: 'ok', text: 'เลือกโลโก้แล้ว — กดบันทึกเพื่อให้มีผลกับทุกคน' })
    } catch (e) {
      setMsg({ kind: 'err', text: e instanceof Error ? e.message : 'อัปโหลดไม่สำเร็จ' })
    }
  }

  async function submit() {
    setSaving(true)
    setMsg(null)
    try {
      await save(form)
      setMsg({ kind: 'ok', text: 'บันทึกแล้ว — พนักงานทุกคนจะเห็นค่าใหม่เมื่อรีเฟรชหน้า' })
    } catch (e) {
      setMsg({ kind: 'err', text: e instanceof Error ? e.message : 'บันทึกไม่สำเร็จ' })
    } finally {
      setSaving(false)
    }
  }

  return (
    <section className="mb-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="mb-4 flex items-start justify-between gap-4">
        <div>
          <h2 className="text-base font-semibold text-slate-900">ตั้งค่าองค์กร</h2>
          <p className="mt-0.5 text-sm text-slate-500">
            ชื่อและโลโก้ที่แสดงบนแถบด้านบนและหน้าเข้าสู่ระบบ — แก้แล้วมีผลทันที ไม่ต้องติดตั้งใหม่
          </p>
        </div>
        <div className="flex items-center gap-2.5 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
          <BrandMark size={32} />
          <span className="text-sm font-semibold text-slate-700">{form.company_name || '—'}</span>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label={SETTING_LABELS.company_name} required>
          <input className={inputCls} value={form.company_name}
            onChange={(e) => set('company_name', e.target.value)} placeholder="เช่น บจก. สมใจบิสกรุ๊ป" />
        </Field>

        <Field label={SETTING_LABELS.portal_tagline}>
          <input className={inputCls} value={form.portal_tagline}
            onChange={(e) => set('portal_tagline', e.target.value)} placeholder="ศูนย์รวมระบบงานพนักงาน" />
        </Field>

        <Field label={SETTING_LABELS.helpdesk_phone}>
          <input className={inputCls} value={form.helpdesk_phone}
            onChange={(e) => set('helpdesk_phone', e.target.value)} placeholder="1234" />
        </Field>

        <Field label={SETTING_LABELS.helpdesk_email}>
          <input className={inputCls} value={form.helpdesk_email}
            onChange={(e) => set('helpdesk_email', e.target.value)} placeholder="helpdesk@company.com" />
        </Field>
      </div>

      <div className="mt-4">
        <label className="mb-1.5 block text-sm font-medium text-slate-700">{SETTING_LABELS.logo_url}</label>
        <div className="flex flex-wrap items-center gap-3">
          <span className="grid h-16 w-16 place-items-center rounded-xl border border-dashed border-slate-300 bg-slate-50 p-1.5">
            {form.logo_url
              ? <img src={form.logo_url} alt="ตัวอย่างโลโก้" className="max-h-full max-w-full object-contain" />
              : <span className="text-[11px] text-slate-400">ยังไม่มี</span>}
          </span>

          <input ref={fileRef} type="file" accept="image/png,image/jpeg,image/webp,image/svg+xml"
            className="hidden" onChange={(e) => void pickLogo(e.target.files?.[0])} />

          <button type="button" onClick={() => fileRef.current?.click()}
            className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50">
            เลือกไฟล์โลโก้…
          </button>

          {form.logo_url ? (
            <button type="button" onClick={() => { set('logo_url', ''); setMsg(null) }}
              className="rounded-lg px-3 py-2 text-sm font-medium text-rose-600 transition hover:bg-rose-50">
              เอาโลโก้ออก
            </button>
          ) : null}

          <span className="text-xs text-slate-400">
            PNG, JPG, WebP หรือ SVG · ไม่เกิน 2 MB · ระบบย่อให้เหลือ 256 พิกเซลอัตโนมัติ
          </span>
        </div>
      </div>

      {msg ? (
        <p className={cx('mt-4 rounded-lg border p-3 text-sm',
          msg.kind === 'ok' ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
                            : 'border-rose-200 bg-rose-50 text-rose-800')}>
          {msg.text}
        </p>
      ) : null}

      <div className="mt-4 flex items-center gap-3">
        <button type="button" onClick={() => void submit()} disabled={!dirty || saving || !form.company_name.trim()}
          className={cx('rounded-lg px-5 py-2 text-sm font-semibold text-white shadow-sm transition',
            dirty && form.company_name.trim() ? 'bg-blue-600 hover:bg-blue-700' : 'bg-slate-300',
            saving && 'opacity-60')}>
          {saving ? 'กำลังบันทึก…' : 'บันทึกการตั้งค่า'}
        </button>
        {dirty ? (
          <button type="button" onClick={() => { setForm(settings); setMsg(null) }}
            className="rounded-lg px-3 py-2 text-sm font-medium text-slate-500 transition hover:bg-slate-100">
            ยกเลิกการแก้ไข
          </button>
        ) : null}
      </div>
    </section>
  )
}

const inputCls =
  'w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-400 focus:ring-2 focus:ring-blue-100'

function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div>
      <label className="mb-1.5 block text-sm font-medium text-slate-700">
        {label}{required ? <span className="ml-0.5 text-rose-500">*</span> : null}
      </label>
      {children}
    </div>
  )
}
