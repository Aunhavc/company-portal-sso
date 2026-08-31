import type { AppEntry, HealthResult } from '../lib/types'
import { ACCENTS, cx } from '../lib/ui'
import { StatusBadge } from './StatusBadge'

interface Props {
  app: AppEntry
  health?: HealthResult
  onOpen: (app: AppEntry) => void
}

export function AppCard({ app, health, onOpen }: Props) {
  const accent = ACCENTS[app.accent] ?? ACCENTS.slate
  const isIntranet = app.network === 'intranet'
  const reachable = !isIntranet || health?.state === 'online' || health?.state === 'unknown'

  return (
    <button
      type="button"
      onClick={() => onOpen(app)}
      className={cx(
        'group flex h-full flex-col items-start gap-3 rounded-2xl border border-slate-200 bg-white p-5 text-left',
        'shadow-sm ring-1 ring-transparent transition duration-150',
        'hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-md focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500',
        accent.ring,
        !reachable && 'opacity-75',
      )}
    >
      <div className="flex w-full items-start gap-3">
        <span
          className={cx(
            'grid h-12 w-12 shrink-0 place-items-center rounded-xl text-2xl leading-none',
            accent.tile,
          )}
          aria-hidden
        >
          {app.icon}
        </span>
        <div className="min-w-0 flex-1">
          <h3 className="truncate text-[15px] font-semibold text-slate-900">{app.name}</h3>
          <p className="mt-0.5 text-xs font-medium text-slate-400">
            {isIntranet ? 'ระบบภายใน · ต้องต่อ VPN' : 'ระบบบนคลาวด์'}
          </p>
        </div>
        <svg
          viewBox="0 0 20 20"
          className="mt-1 h-4 w-4 shrink-0 text-slate-300 transition group-hover:translate-x-0.5 group-hover:text-slate-500"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        >
          <path d="M7 4l6 6-6 6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </div>

      {app.description ? (
        <p className="line-clamp-2 text-sm leading-relaxed text-slate-500">{app.description}</p>
      ) : null}

      <div className="mt-auto flex w-full items-center justify-between gap-2 pt-1">
        <StatusBadge network={app.network} health={health} />
        {app.sso_url ? (
          <span className="text-[11px] font-medium text-slate-400">เข้าอัตโนมัติ (SSO)</span>
        ) : null}
      </div>
    </button>
  )
}
