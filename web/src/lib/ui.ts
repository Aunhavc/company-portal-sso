import type { AccentColor, AnnouncementCategory } from './types'

export function cx(...parts: Array<string | false | null | undefined>): string {
  return parts.filter(Boolean).join(' ')
}

/**
 * คลาส Tailwind ต่อสีเน้น — เขียนเป็นสตริงเต็มทุกตัว
 * (Tailwind สแกนหาคลาสจากซอร์ส จึงห้ามประกอบชื่อคลาสด้วยการต่อสตริง)
 */
export const ACCENTS: Record<AccentColor, { tile: string; ring: string; text: string }> = {
  slate:   { tile: 'bg-slate-100 text-slate-700',     ring: 'group-hover:ring-slate-300',   text: 'text-slate-600' },
  blue:    { tile: 'bg-blue-100 text-blue-700',       ring: 'group-hover:ring-blue-300',    text: 'text-blue-600' },
  emerald: { tile: 'bg-emerald-100 text-emerald-700', ring: 'group-hover:ring-emerald-300', text: 'text-emerald-600' },
  amber:   { tile: 'bg-amber-100 text-amber-700',     ring: 'group-hover:ring-amber-300',   text: 'text-amber-600' },
  rose:    { tile: 'bg-rose-100 text-rose-700',       ring: 'group-hover:ring-rose-300',    text: 'text-rose-600' },
  violet:  { tile: 'bg-violet-100 text-violet-700',   ring: 'group-hover:ring-violet-300',  text: 'text-violet-600' },
  cyan:    { tile: 'bg-cyan-100 text-cyan-700',       ring: 'group-hover:ring-cyan-300',    text: 'text-cyan-600' },
  orange:  { tile: 'bg-orange-100 text-orange-700',   ring: 'group-hover:ring-orange-300',  text: 'text-orange-600' },
}

export const ACCENT_OPTIONS: AccentColor[] =
  ['slate', 'blue', 'emerald', 'amber', 'rose', 'violet', 'cyan', 'orange']

export const ACCENT_SWATCH: Record<AccentColor, string> = {
  slate: 'bg-slate-500', blue: 'bg-blue-500', emerald: 'bg-emerald-500', amber: 'bg-amber-500',
  rose: 'bg-rose-500', violet: 'bg-violet-500', cyan: 'bg-cyan-500', orange: 'bg-orange-500',
}

export const CATEGORY_BADGE: Record<AnnouncementCategory, string> = {
  'IT Alert':     'bg-rose-50 text-rose-700 ring-rose-200',
  'HR':           'bg-violet-50 text-violet-700 ring-violet-200',
  'Announcement': 'bg-blue-50 text-blue-700 ring-blue-200',
  'General':      'bg-slate-100 text-slate-700 ring-slate-200',
}

export const CATEGORY_LABEL: Record<AnnouncementCategory, string> = {
  'IT Alert': 'แจ้งเตือน IT',
  'HR': 'ฝ่ายบุคคล',
  'Announcement': 'ประกาศ',
  'General': 'ทั่วไป',
}

const thaiDate = new Intl.DateTimeFormat('th-TH', {
  day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit',
})

export function formatDate(iso: string): string {
  try {
    return thaiDate.format(new Date(iso))
  } catch {
    return iso
  }
}

export function initials(name: string | null | undefined, email: string): string {
  const source = (name ?? '').trim() || email
  const parts = source.split(/[\s.@_-]+/).filter(Boolean)
  return (parts[0]?.[0] ?? '?').toUpperCase() + (parts[1]?.[0] ?? '').toUpperCase()
}
