import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { api } from './api'
import { env } from './env'
import type { Settings } from './types'

/**
 * ค่าตั้งค่าองค์กร — โหลดจากฐานข้อมูลตอนเปิดแอป
 * ผู้ดูแลระบบแก้ได้จากหน้าจัดการ โดยไม่ต้อง deploy ใหม่
 *
 * อ่านได้ตั้งแต่ยังไม่ล็อกอิน เพราะหน้าล็อกอินต้องแสดงชื่อและโลโก้บริษัท
 * ถ้าโหลดไม่สำเร็จจะถอยไปใช้ค่าจาก environment variable
 */

const FALLBACK: Settings = {
  company_name: env.companyName,
  logo_url: '',
  portal_tagline: 'ศูนย์รวมระบบงานพนักงาน',
  helpdesk_phone: '1234',
  helpdesk_email: 'helpdesk@company.com',
}

interface Ctx {
  settings: Settings
  loading: boolean
  save: (next: Settings) => Promise<void>
  reload: () => Promise<void>
}

const SettingsContext = createContext<Ctx | null>(null)

export function useSettings(): Ctx {
  const ctx = useContext(SettingsContext)
  if (!ctx) throw new Error('useSettings ต้องอยู่ภายใน <SettingsProvider>')
  return ctx
}

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<Settings>(FALLBACK)
  const [loading, setLoading] = useState(true)

  const reload = useCallback(async () => {
    try {
      const s = await api.getSettings()
      // ช่องที่เว้นว่างในฐานข้อมูลให้ใช้ค่าสำรอง เพื่อไม่ให้หน้าจอโล่ง
      setSettings({
        company_name: s.company_name || FALLBACK.company_name,
        logo_url: s.logo_url || '',
        portal_tagline: s.portal_tagline || FALLBACK.portal_tagline,
        helpdesk_phone: s.helpdesk_phone || FALLBACK.helpdesk_phone,
        helpdesk_email: s.helpdesk_email || FALLBACK.helpdesk_email,
      })
    } catch {
      setSettings(FALLBACK)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void reload()
  }, [reload])

  // อัปเดตชื่อแท็บเบราว์เซอร์ตามชื่อบริษัท
  useEffect(() => {
    document.title = settings.company_name
  }, [settings.company_name])

  const save = useCallback(async (next: Settings) => {
    await api.saveSettings(next)
    setSettings(next)
  }, [])

  const value = useMemo(() => ({ settings, loading, save, reload }), [settings, loading, save, reload])
  return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>
}

// ---------------------------------------------------------------------------
/** ตราสัญลักษณ์: ใช้โลโก้ที่อัปโหลดไว้ ถ้าไม่มีก็แสดงตัวย่อจากชื่อบริษัท */
export function BrandMark({ size = 36 }: { size?: number }) {
  const { settings } = useSettings()
  const initials = (settings.company_name.match(/[A-Za-zก-๙]/g) ?? ['C']).slice(0, 2).join('').toUpperCase()

  if (settings.logo_url) {
    return (
      <img
        src={settings.logo_url}
        alt={settings.company_name}
        style={{ width: size, height: size }}
        className="shrink-0 rounded-xl object-contain"
      />
    )
  }
  return (
    <span
      style={{ width: size, height: size }}
      className="grid shrink-0 place-items-center rounded-xl bg-blue-600 text-sm font-bold text-white"
    >
      {initials}
    </span>
  )
}
