import { useEffect, useMemo, useState } from 'react'
import { Modal } from './Modal'
import { ACCENT_OPTIONS, ACCENT_SWATCH, ACCENTS, cx } from '../lib/ui'
import type { AccentColor, AppEntry, AppInput, NetworkZone, UserRole } from '../lib/types'

/**
 * ฟอร์มเพิ่ม/แก้ไขแอป — ใช้ตัวเดียวกันทั้งสองกรณี
 * ออกแบบให้กรอกเร็ว: พิมพ์ชื่อ → slug สร้างให้อัตโนมัติ, เลือกฝั่งเครือข่ายแล้วช่องที่เกี่ยวข้องจะโผล่มาเอง
 */

const ICON_PRESETS = ['🗂️', '☁️', '🏭', '📦', '🧑‍💼', '💰', '📊', '🛡️', '🧾', '🚚', '🛠️', '📮', '🗓️', '🔬', '🏷️', '🖥️']

const EMPTY: AppInput = {
  slug: '',
  name: '',
  description: '',
  category: 'ทั่วไป',
  network: 'internet',
  url: '',
  sso_url: null,
  health_url: null,
  icon: '🗂️',
  accent: 'blue',
  open_in_new_tab: true,
  allowed_roles: ['user', 'admin'],
  sort_order: 100,
  is_active: true,
}

function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9ก-๙\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .slice(0, 40)
}

interface Props {
  open: boolean
  editing: AppEntry | null
  categories: string[]
  saving: boolean
  onClose: () => void
  onSubmit: (input: AppInput) => void
}

export function AppFormModal({ open, editing, categories, saving, onClose, onSubmit }: Props) {
  const [form, setForm] = useState<AppInput>(EMPTY)
  const [slugTouched, setSlugTouched] = useState(false)
  const [probing, setProbing] = useState<'idle' | 'running' | 'ok' | 'fail'>('idle')

  useEffect(() => {
    if (!open) return
    setProbing('idle')
    if (editing) {
      const { id: _id, created_at: _c, updated_at: _u, ...rest } = editing
      setForm(rest)
      setSlugTouched(true)
    } else {
      setForm(EMPTY)
      setSlugTouched(false)
    }
  }, [open, editing])

  const set = <K extends keyof AppInput>(key: K, value: AppInput[K]) =>
    setForm((f) => ({ ...f, [key]: value }))

  const errors = useMemo(() => {
    const e: Partial<Record<keyof AppInput, string>> = {}
    if (!form.name.trim()) e.name = 'กรุณากรอกชื่อแอป'
    if (!form.slug.trim()) e.slug = 'กรุณากรอกรหัสอ้างอิง'
    if (!/^https?:\/\/.+/.test(form.url)) e.url = 'ต้องเป็น URL เต็ม ขึ้นต้นด้วย http:// หรือ https://'
    if (form.sso_url && !/^https?:\/\/.+/.test(form.sso_url)) e.sso_url = 'รูปแบบ URL ไม่ถูกต้อง'
    if (form.health_url && !/^https?:\/\/.+/.test(form.health_url)) e.health_url = 'รูปแบบ URL ไม่ถูกต้อง'
    if (form.allowed_roles.length === 0) e.allowed_roles = 'ต้องเลือกอย่างน้อย 1 กลุ่ม'
    return e
  }, [form])

  const valid = Object.keys(errors).length === 0

  async function testHealth() {
    if (!form.health_url) return
    setProbing('running')
    try {
      const controller = new AbortController()
      const timer = setTimeout(() => controller.abort(), 4000)
      try {
        await fetch(form.health_url, { mode: 'no-cors', cache: 'no-store', signal: controller.signal })
        setProbing('ok')
      } finally {
        clearTimeout(timer)
      }
    } catch {
      setProbing('fail')
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      size="lg"
      title={editing ? `แก้ไข: ${editing.name}` : 'เพิ่มแอปใหม่'}
      subtitle="แอปจะไปแสดงบนหน้าหลักให้พนักงานทันทีหลังบันทึก"
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
            disabled={!valid || saving}
            onClick={() => onSubmit({ ...form, slug: form.slug.trim(), name: form.name.trim() })}
            className="rounded-lg bg-blue-600 px-5 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {saving ? 'กำลังบันทึก…' : editing ? 'บันทึกการแก้ไข' : 'เพิ่มแอป'}
          </button>
        </>
      }
    >
      <div className="space-y-6">
        {/* --- ตัวอย่างการ์ด --- */}
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
          <p className="mb-3 text-xs font-bold uppercase tracking-wider text-slate-400">ตัวอย่างการ์ด</p>
          <div className="flex items-start gap-3 rounded-xl border border-slate-200 bg-white p-4">
            <span className={cx('grid h-12 w-12 place-items-center rounded-xl text-2xl', ACCENTS[form.accent].tile)}>
              {form.icon}
            </span>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-slate-900">{form.name || 'ชื่อแอป'}</p>
              <p className="text-xs text-slate-400">
                {form.network === 'intranet' ? 'ระบบภายใน · ต้องต่อ VPN' : 'ระบบบนคลาวด์'}
              </p>
              <p className="mt-1 line-clamp-2 text-sm text-slate-500">
                {form.description || 'คำอธิบายสั้น ๆ ของระบบงาน'}
              </p>
            </div>
          </div>
        </div>

        {/* --- ข้อมูลพื้นฐาน --- */}
        <Fieldset legend="ข้อมูลพื้นฐาน">
          <Row>
            <Field label="ชื่อแอป" error={errors.name} required className="sm:col-span-2">
              <input
                className={inputCls}
                value={form.name}
                placeholder="เช่น ระบบจัดซื้อออนไลน์"
                onChange={(e) => {
                  set('name', e.target.value)
                  if (!slugTouched) set('slug', slugify(e.target.value))
                }}
              />
            </Field>

            <Field label="รหัสอ้างอิง (slug)" error={errors.slug} required hint="ห้ามซ้ำกับแอปอื่น">
              <input
                className={inputCls}
                value={form.slug}
                placeholder="purchase"
                onChange={(e) => {
                  setSlugTouched(true)
                  set('slug', e.target.value)
                }}
              />
            </Field>
          </Row>

          <Field label="คำอธิบาย">
            <textarea
              className={cx(inputCls, 'min-h-[68px] resize-y')}
              value={form.description ?? ''}
              placeholder="อธิบายสั้น ๆ ว่าระบบนี้ใช้ทำอะไร"
              onChange={(e) => set('description', e.target.value)}
            />
          </Field>

          <Row>
            <Field label="หมวดหมู่" hint="ใช้จัดกลุ่มการ์ดบนหน้าหลัก">
              <input
                className={inputCls}
                list="app-categories"
                value={form.category}
                onChange={(e) => set('category', e.target.value)}
              />
              <datalist id="app-categories">
                {categories.map((c) => (
                  <option key={c} value={c} />
                ))}
              </datalist>
            </Field>

            <Field label="ลำดับการแสดง" hint="เลขน้อยขึ้นก่อน">
              <input
                type="number"
                className={inputCls}
                value={form.sort_order}
                onChange={(e) => set('sort_order', Number(e.target.value) || 0)}
              />
            </Field>
          </Row>
        </Fieldset>

        {/* --- เครือข่ายและปลายทาง --- */}
        <Fieldset legend="เครือข่ายและปลายทาง">
          <Field label="แอปนี้อยู่ฝั่งไหน" required>
            <div className="grid gap-2 sm:grid-cols-2">
              <ZoneOption
                zone="internet"
                current={form.network}
                title="ระบบบนคลาวด์"
                detail="เข้าได้จากทุกที่ ไม่ต้องต่อ VPN"
                icon="☁️"
                onSelect={set}
              />
              <ZoneOption
                zone="intranet"
                current={form.network}
                title="ระบบภายในองค์กร"
                detail="ต้องเชื่อมต่อ VPN ก่อนใช้งาน"
                icon="🏢"
                onSelect={set}
              />
            </div>
          </Field>

          <Field label="URL ปลายทาง" error={errors.url} required>
            <input
              className={inputCls}
              value={form.url}
              placeholder={form.network === 'intranet' ? 'https://erp.company.local/' : 'https://app.company.com'}
              onChange={(e) => set('url', e.target.value)}
            />
          </Field>

          <Field
            label="URL สำหรับเข้าผ่าน SSO"
            hint="ถ้ากรอก ระบบจะพาไป URL นี้แทนเพื่อล็อกอินอัตโนมัติ (เช่น .../auth-callback.php)"
            error={errors.sso_url}
          >
            <input
              className={inputCls}
              value={form.sso_url ?? ''}
              placeholder="https://erp.company.local/auth-callback.php"
              onChange={(e) => set('sso_url', e.target.value || null)}
            />
          </Field>

          <Field
            label="URL ตรวจสอบสถานะ (health check)"
            hint="ถ้ากรอก การ์ดจะแสดงไฟเขียว/เทาบอกว่าเข้าถึงได้หรือไม่ — แนะนำสำหรับระบบภายใน"
            error={errors.health_url}
          >
            <div className="flex gap-2">
              <input
                className={inputCls}
                value={form.health_url ?? ''}
                placeholder="https://erp.company.local/ping.php"
                onChange={(e) => {
                  set('health_url', e.target.value || null)
                  setProbing('idle')
                }}
              />
              <button
                type="button"
                onClick={() => void testHealth()}
                disabled={!form.health_url || probing === 'running'}
                className="shrink-0 rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:opacity-40"
              >
                {probing === 'running' ? 'กำลังทดสอบ…' : 'ทดสอบ'}
              </button>
            </div>
            {probing === 'ok' ? (
              <p className="mt-1.5 text-xs font-medium text-emerald-600">✓ เชื่อมต่อได้จากเครื่องนี้</p>
            ) : probing === 'fail' ? (
              <p className="mt-1.5 text-xs font-medium text-rose-600">
                ✗ เชื่อมต่อไม่ได้ — ตรวจสอบ VPN, URL หรือ HTTPS ของเซิร์ฟเวอร์ปลายทาง
              </p>
            ) : null}
          </Field>

          <label className="flex items-center gap-2.5 text-sm text-slate-700">
            <input
              type="checkbox"
              className="h-4 w-4 rounded border-slate-300 text-blue-600"
              checked={form.open_in_new_tab}
              onChange={(e) => set('open_in_new_tab', e.target.checked)}
            />
            เปิดในแท็บใหม่
          </label>
        </Fieldset>

        {/* --- หน้าตาและสิทธิ์ --- */}
        <Fieldset legend="หน้าตาและสิทธิ์การเข้าถึง">
          <Field label="ไอคอน" hint="เลือกจากรายการหรือวาง emoji ใดก็ได้">
            <div className="flex flex-wrap items-center gap-1.5">
              {ICON_PRESETS.map((ic) => (
                <button
                  key={ic}
                  type="button"
                  onClick={() => set('icon', ic)}
                  className={cx(
                    'grid h-9 w-9 place-items-center rounded-lg border text-lg transition',
                    form.icon === ic ? 'border-blue-500 bg-blue-50' : 'border-slate-200 hover:bg-slate-50',
                  )}
                >
                  {ic}
                </button>
              ))}
              <input
                className="ml-1 w-20 rounded-lg border border-slate-200 px-2 py-1.5 text-center text-lg outline-none focus:border-blue-400"
                value={form.icon}
                maxLength={4}
                onChange={(e) => set('icon', e.target.value)}
              />
            </div>
          </Field>

          <Field label="สีเน้น">
            <div className="flex flex-wrap gap-2">
              {ACCENT_OPTIONS.map((c: AccentColor) => (
                <button
                  key={c}
                  type="button"
                  aria-label={c}
                  onClick={() => set('accent', c)}
                  className={cx(
                    'h-8 w-8 rounded-full ring-offset-2 transition',
                    ACCENT_SWATCH[c],
                    form.accent === c ? 'ring-2 ring-slate-900' : 'hover:ring-2 hover:ring-slate-300',
                  )}
                />
              ))}
            </div>
          </Field>

          <Field label="ใครเห็นแอปนี้ได้" error={errors.allowed_roles} required>
            <div className="flex gap-4">
              {(['user', 'admin'] as UserRole[]).map((role) => (
                <label key={role} className="flex items-center gap-2 text-sm text-slate-700">
                  <input
                    type="checkbox"
                    className="h-4 w-4 rounded border-slate-300 text-blue-600"
                    checked={form.allowed_roles.includes(role)}
                    onChange={(e) =>
                      set(
                        'allowed_roles',
                        e.target.checked
                          ? [...form.allowed_roles, role]
                          : form.allowed_roles.filter((r) => r !== role),
                      )
                    }
                  />
                  {role === 'admin' ? 'ผู้ดูแลระบบ' : 'พนักงานทั่วไป'}
                </label>
              ))}
            </div>
          </Field>

          <label className="flex items-center gap-2.5 text-sm text-slate-700">
            <input
              type="checkbox"
              className="h-4 w-4 rounded border-slate-300 text-blue-600"
              checked={form.is_active}
              onChange={(e) => set('is_active', e.target.checked)}
            />
            เปิดใช้งาน (ยกเลิกติ๊กเพื่อซ่อนจากหน้าหลักโดยไม่ต้องลบ)
          </label>
        </Fieldset>
      </div>
    </Modal>
  )
}

// -----------------------------------------------------------------------------
const inputCls =
  'w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-400 focus:ring-2 focus:ring-blue-100'

function Fieldset({ legend, children }: { legend: string; children: React.ReactNode }) {
  return (
    <fieldset className="space-y-4">
      <legend className="mb-3 w-full border-b border-slate-200 pb-2 text-xs font-bold uppercase tracking-wider text-slate-400">
        {legend}
      </legend>
      {children}
    </fieldset>
  )
}

function Row({ children }: { children: React.ReactNode }) {
  return <div className="grid gap-4 sm:grid-cols-3">{children}</div>
}

function Field({
  label, hint, error, required, className, children,
}: {
  label: string
  hint?: string
  error?: string
  required?: boolean
  className?: string
  children: React.ReactNode
}) {
  return (
    <div className={className}>
      <label className="mb-1.5 block text-sm font-medium text-slate-700">
        {label}
        {required ? <span className="ml-0.5 text-rose-500">*</span> : null}
      </label>
      {children}
      {error ? (
        <p className="mt-1.5 text-xs font-medium text-rose-600">{error}</p>
      ) : hint ? (
        <p className="mt-1.5 text-xs text-slate-400">{hint}</p>
      ) : null}
    </div>
  )
}

function ZoneOption({
  zone, current, title, detail, icon, onSelect,
}: {
  zone: NetworkZone
  current: NetworkZone
  title: string
  detail: string
  icon: string
  onSelect: (key: 'network', value: NetworkZone) => void
}) {
  const active = current === zone
  return (
    <button
      type="button"
      onClick={() => onSelect('network', zone)}
      className={cx(
        'flex items-start gap-3 rounded-xl border p-3 text-left transition',
        active ? 'border-blue-500 bg-blue-50 ring-1 ring-blue-200' : 'border-slate-200 hover:bg-slate-50',
      )}
    >
      <span className="text-xl leading-none">{icon}</span>
      <span className="min-w-0">
        <span className="block text-sm font-semibold text-slate-900">{title}</span>
        <span className="block text-xs text-slate-500">{detail}</span>
      </span>
    </button>
  )
}
