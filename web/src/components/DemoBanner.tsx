import { useState } from 'react'
import { isLive, missingConfigKeys } from '../lib/env'

/** แจ้งเตือนว่ายังไม่ได้ต่อระบบหลังบ้านจริง พร้อมบอกว่าขาดค่าอะไรบ้าง */
export function DemoBanner() {
  const [dismissed, setDismissed] = useState(false)
  if (isLive || dismissed) return null

  const missing = missingConfigKeys()

  return (
    <div className="mb-6 rounded-2xl border border-amber-200 bg-amber-50 p-4">
      <div className="flex items-start gap-3">
        <span className="text-lg leading-none">🧪</span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-amber-900">
            กำลังทำงานในโหมดสาธิต — ข้อมูลเก็บอยู่ในเบราว์เซอร์เครื่องนี้เท่านั้น
          </p>
          <p className="mt-1 text-sm leading-relaxed text-amber-800">
            ทุกอย่างใช้งานได้จริงรวมถึงการเพิ่ม/แก้ไขแอป เมื่อกรอกค่าใน{' '}
            <code className="rounded bg-amber-100 px-1 py-0.5 text-[12px]">web/.env</code>{' '}
            ครบแล้ว ระบบจะสลับไปใช้ Auth0 + Supabase จริงโดยอัตโนมัติ
          </p>
          {missing.length > 0 ? (
            <p className="mt-2 text-xs text-amber-700">
              ยังขาด:{' '}
              {missing.map((k) => (
                <code key={k} className="mr-1 rounded bg-amber-100 px-1 py-0.5">
                  {k}
                </code>
              ))}
            </p>
          ) : null}
        </div>
        <button
          type="button"
          onClick={() => setDismissed(true)}
          className="shrink-0 rounded-lg p-1 text-amber-500 transition hover:bg-amber-100 hover:text-amber-800"
          aria-label="ปิดข้อความ"
        >
          <svg viewBox="0 0 20 20" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M5 5l10 10M15 5L5 15" strokeLinecap="round" />
          </svg>
        </button>
      </div>
    </div>
  )
}
