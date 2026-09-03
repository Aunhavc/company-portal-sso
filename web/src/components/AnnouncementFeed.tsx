import { useMemo, useState } from 'react'
import { Modal } from './Modal'
import { categoryMap } from '../lib/announcements'
import type { Announcement, AnnouncementCategoryEntry } from '../lib/types'
import { CATEGORY_BADGE_BY_COLOR, cx, formatDate } from '../lib/ui'

interface Props {
  items: Announcement[]
  categories: AnnouncementCategoryEntry[]
  loading: boolean
  error: string | null
}

export function AnnouncementFeed({ items, categories, loading, error }: Props) {
  const [active, setActive] = useState<Announcement | null>(null)
  const catMap = useMemo(() => categoryMap(categories), [categories])
  const labelOf = (key: string) => catMap[key]?.label ?? key
  const badgeOf = (key: string) => CATEGORY_BADGE_BY_COLOR[catMap[key]?.color ?? 'slate']

  return (
    <section aria-labelledby="ann-heading">
      <div className="mb-4 flex items-baseline justify-between">
        <h2 id="ann-heading" className="text-base font-semibold text-slate-900">
          ประกาศข่าวสาร
        </h2>
        <span className="text-xs text-slate-400">{items.length} รายการ</span>
      </div>

      {loading ? (
        <div className="space-y-3">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-24 animate-pulse rounded-2xl bg-slate-100" />
          ))}
        </div>
      ) : error ? (
        <p className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">{error}</p>
      ) : items.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-slate-300 p-6 text-center text-sm text-slate-400">
          ยังไม่มีประกาศ
        </p>
      ) : (
        <ul className="space-y-3">
          {items.map((item) => (
            <li key={item.id}>
              <button
                type="button"
                onClick={() => setActive(item)}
                className="w-full rounded-2xl border border-slate-200 bg-white p-4 text-left shadow-sm transition hover:border-slate-300 hover:shadow-md focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
              >
                <div className="mb-2 flex items-center gap-2">
                  <span
                    className={cx(
                      'rounded-full px-2 py-0.5 text-[11px] font-semibold ring-1 ring-inset',
                      badgeOf(item.category),
                    )}
                  >
                    {labelOf(item.category)}
                  </span>
                  {item.is_pinned ? (
                    <span className="text-[11px] font-semibold text-amber-600">📌 ปักหมุด</span>
                  ) : null}
                </div>
                <h3 className="text-sm font-semibold leading-snug text-slate-900">{item.title}</h3>
                <p className="mt-1 line-clamp-2 text-sm leading-relaxed text-slate-500">
                  {item.content}
                </p>
                <p className="mt-2 text-[11px] text-slate-400">{formatDate(item.published_at)}</p>
              </button>
            </li>
          ))}
        </ul>
      )}

      <Modal
        open={!!active}
        onClose={() => setActive(null)}
        title={active?.title ?? ''}
        subtitle={
          active ? (
            <span className="flex items-center gap-2">
              <span
                className={cx(
                  'rounded-full px-2 py-0.5 text-[11px] font-semibold ring-1 ring-inset',
                  badgeOf(active.category),
                )}
              >
                {labelOf(active.category)}
              </span>
              {formatDate(active.published_at)}
            </span>
          ) : undefined
        }
      >
        <div className="whitespace-pre-wrap text-[15px] leading-7 text-slate-700">
          {active?.content}
        </div>
      </Modal>
    </section>
  )
}
