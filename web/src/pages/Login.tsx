import { useSession } from '../lib/session'
import { isLive } from '../lib/env'
import { adConnectionName } from '../lib/auth0Config'
import { BrandMark, useSettings } from '../lib/settings'

export function Login() {
  const { login, error, isLoading } = useSession()
  const { settings } = useSettings()
  const adConnection = adConnectionName()

  return (
    <div className="grid min-h-screen place-items-center bg-gradient-to-b from-slate-50 to-slate-100 px-4">
      <div className="w-full max-w-md">
        <div className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
          <div className="mb-6 flex items-center gap-3">
            <BrandMark size={44} />
            <div>
              <h1 className="text-lg font-bold text-slate-900">{settings.company_name}</h1>
              <p className="text-xs text-slate-500">{settings.portal_tagline}</p>
            </div>
          </div>

          <p className="text-sm leading-relaxed text-slate-600">
            เข้าสู่ระบบด้วยบัญชีเดียวเพียงครั้งเดียว
            แล้วใช้งานได้ทุกระบบทั้งบนคลาวด์และภายในองค์กรโดยไม่ต้องกรอกรหัสผ่านซ้ำ
          </p>

          {error ? (
            <p className="mt-4 rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">
              {error}
            </p>
          ) : null}

          {/* ถ้าตั้งค่า AD ไว้ ให้ปุ่มบัญชีพนักงานเป็นทางหลัก เพราะเป็นช่องทางของคนส่วนใหญ่ */}
          {isLive && adConnection ? (
            <>
              <button
                type="button"
                onClick={() => login(adConnection)}
                disabled={isLoading}
                className="mt-6 w-full rounded-xl bg-blue-600 px-4 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700 disabled:opacity-60"
              >
                {isLoading ? 'กำลังตรวจสอบ…' : 'เข้าสู่ระบบด้วยบัญชีพนักงาน (AD)'}
              </button>
              <p className="mt-2 text-center text-xs text-slate-500">
                ใช้ชื่อผู้ใช้และรหัสผ่านเดียวกับที่ใช้เข้าเครื่องคอมพิวเตอร์ในออฟฟิศ
              </p>
              <button
                type="button"
                onClick={() => login()}
                disabled={isLoading}
                className="mt-4 w-full rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:opacity-60"
              >
                เข้าสู่ระบบด้วยวิธีอื่น
              </button>
            </>
          ) : (
            <button
              type="button"
              onClick={() => login()}
              disabled={isLoading}
              className="mt-6 w-full rounded-xl bg-blue-600 px-4 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700 disabled:opacity-60"
            >
              {isLoading
                ? 'กำลังตรวจสอบ…'
                : isLive
                  ? 'เข้าสู่ระบบด้วยบัญชีบริษัท'
                  : 'เข้าสู่ระบบ (โหมดสาธิต)'}
            </button>
          )}

          {!isLive ? (
            <p className="mt-4 rounded-xl bg-amber-50 p-3 text-xs leading-relaxed text-amber-800">
              ยังไม่ได้ตั้งค่า Auth0/Supabase — กดปุ่มด้านบนเพื่อเข้าดูหน้าจอในโหมดสาธิตได้ทันที
            </p>
          ) : null}
        </div>

        <p className="mt-5 text-center text-xs text-slate-400">
          {`ปกป้องด้วยระบบยืนยันตัวตนกลาง (SSO) · หากเข้าใช้งานไม่ได้ ติดต่อ IT Helpdesk ต่อ ${settings.helpdesk_phone}`}
        </p>
      </div>
    </div>
  )
}
