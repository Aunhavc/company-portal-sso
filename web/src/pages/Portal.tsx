import { useCallback } from 'react'
import { AppGrid } from '../components/AppGrid'
import { AnnouncementFeed } from '../components/AnnouncementFeed'
import { DemoBanner } from '../components/DemoBanner'
import { useAnnouncementCategories, useAnnouncements, useApps } from '../hooks/usePortalData'
import { useHealthProbes } from '../hooks/useHealthProbes'
import { useSession } from '../lib/session'
import { gateBeforeOpen } from '../lib/intranetGate'
import type { AppEntry } from '../lib/types'

export function Portal() {
  const { profile, isAdmin } = useSession()
  const apps = useApps()
  const announcements = useAnnouncements()
  const categories = useAnnouncementCategories()
  const { results: health, refresh } = useHealthProbes(apps.data)

  const navigate = useCallback((app: AppEntry, target: string) => {
    if (app.open_in_new_tab) {
      window.open(target, '_blank', 'noopener,noreferrer')
    } else {
      window.location.href = target
    }
  }, [])

  const openApp = useCallback(
    (app: AppEntry) => {
      // แอปภายในที่ยืนยันไม่ได้ว่าถึง → ไปหน้ากลาง /launch ให้ตรวจเครือข่ายก่อน
      // ห้ามเปิด URL ภายในตรง ๆ เพราะถ้าต่อไม่ถึงผู้ใช้จะเจอหน้า error ของเบราว์เซอร์
      if (gateBeforeOpen(app, health[app.id]) === 'ask') {
        navigate(app, `/launch/${encodeURIComponent(app.slug)}`)
        return
      }
      // มี sso_url = ให้ปลายทางทำ SSO handshake กับ Auth0 ก่อน แล้วค่อยเข้าหน้างาน
      navigate(app, app.sso_url ?? app.url)
    },
    [health, navigate],
  )

  const greeting = (() => {
    const h = new Date().getHours()
    if (h < 12) return 'สวัสดีตอนเช้า'
    if (h < 17) return 'สวัสดีตอนบ่าย'
    return 'สวัสดีตอนเย็น'
  })()

  const firstName = (profile?.full_name ?? profile?.email ?? '').split(' ')[0]

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <DemoBanner />

      <div className="mb-8">
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
          {greeting}, {firstName}
        </h1>
        <p className="mt-1.5 text-sm text-slate-500">
          เลือกระบบงานที่ต้องการใช้ — เข้าสู่ระบบครั้งเดียว ใช้ได้ทุกระบบโดยไม่ต้องกรอกรหัสผ่านซ้ำ
        </p>
      </div>

      <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_22rem]">
        <AppGrid
          apps={apps.data}
          loading={apps.loading}
          error={apps.error}
          health={health}
          isAdmin={isAdmin}
          onOpen={openApp}
          onRefresh={() => {
            void apps.reload()
            void refresh()
          }}
        />

        <aside className="lg:sticky lg:top-24 lg:self-start">
          <AnnouncementFeed
            items={announcements.data}
            categories={categories.data}
            loading={announcements.loading}
            error={announcements.error}
          />
        </aside>
      </div>
    </div>
  )
}
