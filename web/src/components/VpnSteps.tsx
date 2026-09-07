import { useSettings } from '../lib/settings'

/** ขั้นตอนต่อ VPN ที่แสดงในหน้าแจ้งก่อนเปิดแอปภายใน — ข้อความกลาง ๆ ปรับตามโปรแกรม VPN ของบริษัทได้ */
const STEPS = [
  { title: 'เปิดโปรแกรม VPN ของบริษัท', detail: 'ค้นหา "VPN" จากเมนู Start หรือไอคอนที่มุมขวาล่างของแถบงาน' },
  { title: 'เข้าสู่ระบบด้วยบัญชีบริษัท', detail: 'ใช้บัญชีชุดเดียวกับที่ใช้เข้าพอร์ทัลนี้' },
  { title: 'รอจนสถานะขึ้นว่า Connected', detail: 'โดยปกติใช้เวลาไม่เกิน 15 วินาที' },
  { title: 'กลับมาที่หน้านี้แล้วกด "ต่อ VPN แล้ว ตรวจสอบอีกครั้ง"', detail: 'ระบบจะตรวจซ้ำและพาเข้าแอปให้ทันที' },
]

export function VpnSteps() {
  return (
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
  )
}

export function HelpdeskNote() {
  const { settings } = useSettings()
  return (
    <div className="rounded-xl bg-slate-50 p-4 text-sm text-slate-600">
      ยังเข้าไม่ได้? ติดต่อ <span className="font-semibold text-slate-800">IT Helpdesk ต่อ {settings.helpdesk_phone}</span>
      {settings.helpdesk_email ? (
        <>
          {' '}หรืออีเมล <span className="font-semibold text-slate-800">{settings.helpdesk_email}</span>
        </>
      ) : null}
    </div>
  )
}
