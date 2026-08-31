import { useSession } from '../lib/session'
import { env, isLive } from '../lib/env'

export function Login() {
  const { login, error, isLoading } = useSession()

  return (
    <div className="grid min-h-screen place-items-center bg-gradient-to-b from-slate-50 to-slate-100 px-4">
      <div className="w-full max-w-md">
        <div className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
          <div className="mb-6 flex items-center gap-3">
            <span className="grid h-11 w-11 place-items-center rounded-2xl bg-blue-600 text-base font-bold text-white">
              CP
            </span>
            <div>
              <h1 className="text-lg font-bold text-slate-900">{env.companyName}</h1>
              <p className="text-xs text-slate-500">ศูนย์รวมระบบงานพนักงาน</p>
            </div>
          </div>

          <p className="text-sm leading-relaxed text-slate-600">
            เข้าสู่ระบบด้วยอีเมลบริษัทเพียงครั้งเดียว
            แล้วใช้งานได้ทุกระบบทั้งบนคลาวด์และภายในองค์กรโดยไม่ต้องกรอกรหัสผ่านซ้ำ
          </p>

          {error ? (
            <p className="mt-4 rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">
              {error}
            </p>
          ) : null}

          <button
            type="button"
            onClick={login}
            disabled={isLoading}
            className="mt-6 w-full rounded-xl bg-blue-600 px-4 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700 disabled:opacity-60"
          >
            {isLoading ? 'กำลังตรวจสอบ…' : isLive ? 'เข้าสู่ระบบด้วยบัญชีบริษัท' : 'เข้าสู่ระบบ (โหมดสาธิต)'}
          </button>

          {!isLive ? (
            <p className="mt-4 rounded-xl bg-amber-50 p-3 text-xs leading-relaxed text-amber-800">
              ยังไม่ได้ตั้งค่า Auth0/Supabase — กดปุ่มด้านบนเพื่อเข้าดูหน้าจอในโหมดสาธิตได้ทันที
            </p>
          ) : null}
        </div>

        <p className="mt-5 text-center text-xs text-slate-400">
          ปกป้องด้วยระบบยืนยันตัวตนกลาง (SSO) · หากเข้าใช้งานไม่ได้ ติดต่อ IT Helpdesk ต่อ 1234
        </p>
      </div>
    </div>
  )
}
