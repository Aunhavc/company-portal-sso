import { useEffect, useRef, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { useSession } from '../lib/session'
import { BrandMark, useSettings } from '../lib/settings'
import { initials } from '../lib/ui'

export function Header() {
  const { profile, isAdmin, logout, mode } = useSession()
  const { settings } = useSettings()
  const [open, setOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)
  const location = useLocation()

  useEffect(() => setOpen(false), [location.pathname])

  useEffect(() => {
    if (!open) return
    const onClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onClick)
    return () => document.removeEventListener('mousedown', onClick)
  }, [open])

  if (!profile) return null

  return (
    <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/85 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-7xl items-center gap-4 px-4 sm:px-6 lg:px-8">
        <Link to="/" className="flex items-center gap-3">
          <BrandMark size={36} />
          <span className="hidden text-base font-semibold text-slate-900 sm:block">
            {settings.company_name}
          </span>
        </Link>

        <nav className="ml-2 hidden items-center gap-1 md:flex">
          <NavLink to="/" label="หน้าหลัก" active={location.pathname === '/'} />
          {isAdmin ? (
            <>
              <NavLink
                to="/admin/apps"
                label="จัดการแอป"
                active={location.pathname.startsWith('/admin/apps')}
              />
              <NavLink
                to="/admin/users"
                label="จัดการผู้ใช้"
                active={location.pathname.startsWith('/admin/users')}
              />
              <NavLink
                to="/admin/announcements"
                label="จัดการประกาศ"
                active={location.pathname.startsWith('/admin/announcements')}
              />
            </>
          ) : null}
        </nav>

        <div className="flex-1" />

        {mode === 'demo' ? (
          <span className="hidden rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-800 sm:inline">
            โหมดสาธิต
          </span>
        ) : null}

        <div className="relative" ref={menuRef}>
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            className="flex items-center gap-2.5 rounded-full py-1 pl-1 pr-2 transition hover:bg-slate-100"
            aria-haspopup="menu"
            aria-expanded={open}
          >
            {profile.avatar_url ? (
              <img
                src={profile.avatar_url}
                alt=""
                className="h-8 w-8 rounded-full object-cover ring-1 ring-slate-200"
              />
            ) : (
              <span className="grid h-8 w-8 place-items-center rounded-full bg-slate-200 text-xs font-bold text-slate-700">
                {initials(profile.full_name, profile.email)}
              </span>
            )}
            <span className="hidden max-w-[10rem] truncate text-sm font-medium text-slate-700 sm:block">
              {profile.full_name ?? profile.email}
            </span>
            <svg viewBox="0 0 20 20" className="h-4 w-4 text-slate-400" fill="none" stroke="currentColor" strokeWidth="1.8">
              <path d="M6 8l4 4 4-4" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>

          {open ? (
            <div
              role="menu"
              className="absolute right-0 mt-2 w-64 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-lg"
            >
              <div className="border-b border-slate-100 px-4 py-3">
                <p className="truncate text-sm font-semibold text-slate-900">
                  {profile.full_name ?? '—'}
                </p>
                <p className="truncate text-xs text-slate-500">{profile.email}</p>
                <span className="mt-2 inline-block rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-600">
                  {profile.role === 'admin' ? 'ผู้ดูแลระบบ' : 'พนักงาน'}
                </span>
              </div>
              {isAdmin ? (
                <>
                  <Link
                    to="/admin/apps"
                    className="block px-4 py-2.5 text-sm text-slate-700 transition hover:bg-slate-50 md:hidden"
                  >
                    จัดการแอป
                  </Link>
                  <Link
                    to="/admin/users"
                    className="block px-4 py-2.5 text-sm text-slate-700 transition hover:bg-slate-50 md:hidden"
                  >
                    จัดการผู้ใช้
                  </Link>
                  <Link
                    to="/admin/announcements"
                    className="block px-4 py-2.5 text-sm text-slate-700 transition hover:bg-slate-50 md:hidden"
                  >
                    จัดการประกาศ
                  </Link>
                </>
              ) : null}
              <button
                type="button"
                onClick={logout}
                className="w-full px-4 py-2.5 text-left text-sm font-medium text-rose-600 transition hover:bg-rose-50"
              >
                ออกจากระบบ
              </button>
            </div>
          ) : null}
        </div>
      </div>
    </header>
  )
}

function NavLink({ to, label, active }: { to: string; label: string; active: boolean }) {
  return (
    <Link
      to={to}
      className={
        active
          ? 'rounded-lg bg-slate-100 px-3 py-1.5 text-sm font-semibold text-slate-900'
          : 'rounded-lg px-3 py-1.5 text-sm font-medium text-slate-600 transition hover:bg-slate-50 hover:text-slate-900'
      }
    >
      {label}
    </Link>
  )
}
