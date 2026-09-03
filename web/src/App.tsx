import { Navigate, Route, Routes } from 'react-router-dom'
import { Header } from './components/Header'
import { Portal } from './pages/Portal'
import { AdminApps } from './pages/AdminApps'
import { AdminUsers } from './pages/AdminUsers'
import { AdminAnnouncements } from './pages/AdminAnnouncements'
import { Login } from './pages/Login'
import { useSession } from './lib/session'
import { resolveView } from './lib/access'

export default function App() {
  const { isLoading, isAuthenticated, profile, isAdmin, error, relogin, needsReauth, logout } =
    useSession()

  const view = resolveView({ isLoading, isAuthenticated, profile })

  if (view === 'loading') return <FullPageSpinner />

  if (view === 'login') return <Login />

  // ล็อกอินผ่านแล้วแต่ยังไม่ได้รับอนุมัติให้ใช้งาน
  if (view === 'pending') {
    return (
      <div className="grid min-h-screen place-items-center bg-slate-50 px-4">
        <div className="max-w-lg rounded-2xl border border-amber-200 bg-white p-6 shadow-sm">
          <h1 className="text-lg font-bold text-slate-900">บัญชีนี้รอการอนุมัติ</h1>
          <p className="mt-2 text-sm leading-relaxed text-slate-600">
            ยืนยันตัวตนสำเร็จแล้ว แต่บัญชีนี้ยังไม่ได้รับอนุญาตให้เข้าใช้งานพอร์ทัล
            กรุณาติดต่อผู้ดูแลระบบเพื่อขออนุมัติ แล้วเข้าสู่ระบบใหม่อีกครั้ง
          </p>
          {profile?.email ? (
            <p className="mt-3 rounded-lg bg-slate-100 p-3 text-xs text-slate-600">
              บัญชีที่ใช้เข้าสู่ระบบ: <span className="font-semibold">{profile.email}</span>
            </p>
          ) : null}
          <button
            type="button"
            onClick={logout}
            className="mt-4 rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-700"
          >
            ออกจากระบบ
          </button>
        </div>
      </div>
    )
  }

  // ล็อกอินผ่านแล้วแต่ซิงค์โปรไฟล์ไม่สำเร็จ — ส่วนใหญ่คือ Supabase Third-Party Auth ยังไม่ได้ตั้ง
  if (view === 'sync-error') {
    return (
      <div className="grid min-h-screen place-items-center bg-slate-50 px-4">
        <div className="max-w-lg rounded-2xl border border-rose-200 bg-white p-6 shadow-sm">
          <h1 className="text-lg font-bold text-slate-900">เชื่อมต่อฐานข้อมูลไม่สำเร็จ</h1>
          <p className="mt-2 text-sm leading-relaxed text-slate-600">
            ยืนยันตัวตนกับ Auth0 สำเร็จแล้ว แต่ยังดึงโปรไฟล์จาก Supabase ไม่ได้
          </p>
          {error ? (
            <pre className="mt-3 overflow-x-auto rounded-lg bg-slate-900 p-3 text-xs text-slate-100">
              {error}
            </pre>
          ) : null}
          {needsReauth ? (
            <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-4">
              <p className="text-sm leading-relaxed text-amber-900">
                เซสชันเดิมในเบราว์เซอร์นี้ใช้ต่อไม่ได้แล้ว กดปุ่มด้านล่างเพื่อล้างแล้วเข้าสู่ระบบใหม่
                ข้อมูลของคุณไม่หายไปไหน
              </p>
              <button
                type="button"
                onClick={relogin}
                className="mt-3 rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-700"
              >
                เข้าสู่ระบบใหม่
              </button>
            </div>
          ) : null}
          <ul className="mt-4 list-disc space-y-1 pl-5 text-sm text-slate-600">
            <li>เปิด Supabase → Authentication → Third Party Auth → เพิ่ม Auth0 domain แล้วหรือยัง</li>
            <li>รัน <code className="rounded bg-slate-100 px-1">supabase/migrations/0001_init.sql</code> ครบหรือยัง</li>
            <li>ตั้ง <code className="rounded bg-slate-100 px-1">VITE_AUTH0_AUDIENCE</code> ให้ตรงกับ API ใน Auth0 หรือยัง</li>
            <li>เพิ่ม Post-Login Action ที่ใส่ claim <code className="rounded bg-slate-100 px-1">role = authenticated</code> หรือยัง</li>
          </ul>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <Header />
      <main>
        <Routes>
          <Route path="/" element={<Portal />} />
          <Route path="/admin/apps" element={isAdmin ? <AdminApps /> : <Navigate to="/" replace />} />
          <Route
            path="/admin/users"
            element={isAdmin ? <AdminUsers /> : <Navigate to="/" replace />}
          />
          <Route
            path="/admin/announcements"
            element={isAdmin ? <AdminAnnouncements /> : <Navigate to="/" replace />}
          />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
      <footer className="border-t border-slate-200 py-6 text-center text-xs text-slate-400">
        เข้าสู่ระบบด้วยบัญชีเดียว (Single Sign-On) · ต้องการความช่วยเหลือ ติดต่อ IT Helpdesk ต่อ 1234
      </footer>
    </div>
  )
}

function FullPageSpinner() {
  return (
    <div className="grid min-h-screen place-items-center bg-slate-50">
      <div className="flex flex-col items-center gap-3">
        <span className="h-8 w-8 animate-spin rounded-full border-[3px] border-slate-200 border-t-blue-600" />
        <p className="text-sm text-slate-500">กำลังตรวจสอบสิทธิ์…</p>
      </div>
    </div>
  )
}
