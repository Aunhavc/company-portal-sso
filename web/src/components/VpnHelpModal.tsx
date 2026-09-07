import { Modal } from './Modal'
import { useSettings } from '../lib/settings'
import type { AppEntry, HealthResult } from '../lib/types'

interface Props {
  app: AppEntry | null
  health?: HealthResult
  onClose: () => void
  onRetry: () => void
  /** ผู้ใช้ยืนยันว่าอยู่ในเครือข่ายบริษัท/ต่อ VPN แล้ว → เปิดแอปและจำไว้ทั้งแท็บ */
  onProceed: (app: AppEntry) => void
}

const STEPS = [
  { title: 'เปิดโปรแกรม VPN ของบริษัท', detail: 'ค้นหา "VPN Client" จากเมนู Start หรือไอคอนที่มุมขวาล่างของแถบงาน' },
  { title: 'เข้าสู่ระบบด้วยบัญชีบริษัท', detail: 'ใช้อีเมลและรหัสผ่านชุดเดียวกับที่ใช้เข้าพอร์ทัลนี้' },
  { title: 'ยืนยันตัวตนขั้นที่สอง (ถ้ามี)', detail: 'กรอกรหัส OTP 6 หลักจากแอปบนมือถือ' },
  { title: 'รอจนสถานะขึ้นว่า Connected', detail: 'โดยปกติใช้เวลาไม่เกิน 15 วินาที' },
  { title: 'กลับมาที่หน้านี้แล้วกด "อยู่ในเครือข่ายแล้ว เปิดเลย"', detail: 'ระบบจะเปิดแอปให้ทันที' },
]

/**
 * กล่องแจ้งก่อนเปิดแอปภายในองค์กร — มี 3 กรณี
 *  unknown  : ไม่มี health check จึงตรวจไม่ได้ (เช่น osTicket ที่ยังเป็น HTTP) → บอกให้ชัดว่าต้องอยู่ใน LAN/VPN
 *  offline  : ตรวจแล้วไม่ถึง → ยังไม่ได้ต่อ VPN
 *  blocked  : ตรวจไม่ได้เพราะ mixed content → บอกเหตุผลทางเทคนิค
 * ทุกกรณีมีปุ่มเปิดต่อ — ห้ามปล่อยให้คลิกแล้วเงียบหรือเจอหน้าเปล่า
 */
export function VpnHelpModal({ app, health, onClose, onRetry, onProceed }: Props) {
  const { settings } = useSettings()
  const state = health?.state ?? 'unknown'
  const blocked = state === 'blocked'
  const offline = state === 'offline'
  const canRecheck = !!app?.health_url

  const title = blocked
    ? 'ตรวจสอบสถานะระบบภายในไม่ได้'
    : offline
      ? 'ต้องเชื่อมต่อ VPN ก่อนใช้งาน'
      : 'แอปนี้อยู่บนเครือข่ายภายในบริษัท (Intranet / LAN)'

  return (
    <Modal
      open={!!app}
      onClose={onClose}
      title={title}
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
          {canRecheck ? (
            <button
              type="button"
              onClick={onRetry}
              className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
            >
              ตรวจสอบอีกครั้ง
            </button>
          ) : null}
          {app ? (
            <button
              type="button"
              onClick={() => onProceed(app)}
              className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700"
            >
              อยู่ในเครือข่ายแล้ว เปิดเลย
            </button>
          ) : null}
        </>
      }
    >
      {blocked ? (
        <div className="mb-5 rounded-xl border border-amber-200 bg-amber-50 p-4">
          <p className="text-sm font-semibold text-amber-900">เหตุผลทางเทคนิค</p>
          <p className="mt-1 text-sm leading-relaxed text-amber-800">{health?.reason}</p>
          <p className="mt-2 text-sm text-amber-800">
            หากอยู่ในสำนักงานหรือเชื่อมต่อ VPN อยู่แล้ว กด &ldquo;อยู่ในเครือข่ายแล้ว เปิดเลย&rdquo; ได้ตามปกติ
          </p>
        </div>
      ) : offline ? (
        <p className="mb-5 text-sm leading-relaxed text-slate-600">
          ระบบนี้ติดตั้งอยู่ในเครือข่ายภายในของบริษัท และขณะนี้เครื่องของคุณเข้าไม่ถึง
          กรุณาเชื่อมต่อ VPN ตามขั้นตอนด้านล่างแล้วกดตรวจสอบอีกครั้ง
        </p>
      ) : (
        <div className="mb-5 rounded-xl border border-blue-200 bg-blue-50 p-4">
          <p className="text-sm font-semibold leading-relaxed text-blue-900">
            แอปนี้อยู่บนเครือข่ายภายใน (Intranet / LAN) ต้องต่อ VPN
            หรือเข้าเครือข่ายของบริษัทก่อนใช้งาน
          </p>
          <p className="mt-2 text-sm leading-relaxed text-blue-800">
            พอร์ทัลตรวจสอบให้ไม่ได้ว่าเครื่องของคุณเข้าถึงระบบนี้อยู่หรือไม่
            — หากอยู่ในสำนักงาน หรือเชื่อมต่อ VPN แล้ว กด &ldquo;อยู่ในเครือข่ายแล้ว เปิดเลย&rdquo;
            หากยังไม่ได้ต่อ ให้เชื่อมต่อ VPN ตามขั้นตอนด้านล่างก่อน มิฉะนั้นจะเปิดหน้าไม่ขึ้น
          </p>
        </div>
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
        ยังเข้าไม่ได้? ติดต่อ <span className="font-semibold text-slate-800">IT Helpdesk ต่อ {settings.helpdesk_phone}</span>
        {settings.helpdesk_email ? (
          <>
            {' '}หรืออีเมล <span className="font-semibold text-slate-800">{settings.helpdesk_email}</span>
          </>
        ) : null}
      </div>
    </Modal>
  )
}
