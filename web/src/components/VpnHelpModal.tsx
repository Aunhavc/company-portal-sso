import { Modal } from './Modal'
import type { AppEntry, HealthResult } from '../lib/types'

interface Props {
  app: AppEntry | null
  health?: HealthResult
  onClose: () => void
  onRetry: () => void
}

const STEPS = [
  { title: 'เปิดโปรแกรม VPN ของบริษัท', detail: 'ค้นหา "VPN Client" จากเมนู Start หรือไอคอนที่มุมขวาล่างของแถบงาน' },
  { title: 'เข้าสู่ระบบด้วยบัญชีบริษัท', detail: 'ใช้อีเมลและรหัสผ่านชุดเดียวกับที่ใช้เข้าพอร์ทัลนี้' },
  { title: 'ยืนยันตัวตนขั้นที่สอง (ถ้ามี)', detail: 'กรอกรหัส OTP 6 หลักจากแอปบนมือถือ' },
  { title: 'รอจนสถานะขึ้นว่า Connected', detail: 'โดยปกติใช้เวลาไม่เกิน 15 วินาที' },
  { title: 'กลับมาที่หน้านี้แล้วกด "ตรวจสอบอีกครั้ง"', detail: 'เมื่อสัญญาณเป็นสีเขียวจึงจะเข้าใช้งานระบบภายในได้' },
]

export function VpnHelpModal({ app, health, onClose, onRetry }: Props) {
  const blocked = health?.state === 'blocked'

  return (
    <Modal
      open={!!app}
      onClose={onClose}
      title={blocked ? 'ตรวจสอบสถานะระบบภายในไม่ได้' : 'ต้องเชื่อมต่อ VPN ก่อนใช้งาน'}
      subtitle={app ? app.name : undefined}
      footer={
        <>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg px-4 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-100"
          >
            ปิด
          </button>
          <button
            type="button"
            onClick={onRetry}
            className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700"
          >
            ตรวจสอบอีกครั้ง
          </button>
          {app ? (
            <a
              href={app.sso_url ?? app.url}
              target={app.open_in_new_tab ? '_blank' : undefined}
              rel="noreferrer"
              className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
            >
              เปิดต่อไปเลย
            </a>
          ) : null}
        </>
      }
    >
      {blocked ? (
        <div className="mb-5 rounded-xl border border-amber-200 bg-amber-50 p-4">
          <p className="text-sm font-semibold text-amber-900">เหตุผลทางเทคนิค</p>
          <p className="mt-1 text-sm leading-relaxed text-amber-800">{health?.reason}</p>
          <p className="mt-2 text-sm text-amber-800">
            คุณยังกดปุ่ม &ldquo;เปิดต่อไปเลย&rdquo; เพื่อเข้าใช้งานได้ตามปกติหากเชื่อมต่อ VPN อยู่แล้ว
          </p>
        </div>
      ) : (
        <p className="mb-5 text-sm leading-relaxed text-slate-600">
          ระบบนี้ติดตั้งอยู่ในเครือข่ายภายในของบริษัท จึงต้องเชื่อมต่อ VPN ก่อนจึงจะเข้าใช้งานได้
          ทำตามขั้นตอนด้านล่างแล้วกลับมากดตรวจสอบอีกครั้ง
        </p>
      )}

      <ol className="space-y-3">
        {STEPS.map((step, i) => (
          <li key={step.title} className="flex gap-3.5">
            <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-blue-100 text-xs font-bold text-blue-700">
              {i + 1}
            </span>
            <div className="min-w-0 pt-0.5">
              <p className="text-sm font-semibold text-slate-800">{step.title}</p>
              <p className="mt-0.5 text-sm leading-relaxed text-slate-500">{step.detail}</p>
            </div>
          </li>
        ))}
      </ol>

      <div className="mt-6 rounded-xl bg-slate-50 p-4 text-sm text-slate-600">
        ยังเข้าไม่ได้? ติดต่อ <span className="font-semibold text-slate-800">IT Helpdesk ต่อ 1234</span>{' '}
        หรืออีเมล <span className="font-semibold text-slate-800">helpdesk@example.com</span>
      </div>
    </Modal>
  )
}
