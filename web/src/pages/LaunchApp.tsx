import { useCallback, useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { HelpdeskNote, VpnSteps } from '../components/VpnSteps'
import { useApps } from '../hooks/usePortalData'
import { outsideMessage } from '../lib/launchMessage'
import { checkCompanyNetwork } from '../lib/networkCheckClient'
import { parseHostList, type NetworkCheckResult } from '../lib/networkCheck'
import { useSession } from '../lib/session'
import { useSettings } from '../lib/settings'
import type { AppEntry } from '../lib/types'
import { cx } from '../lib/ui'

/**
 * หน้ากลางก่อนเข้าแอปภายในองค์กร — /launch/:slug
 *
 * ข้อกำหนด (7 ก.ย. 2569): ผู้ใช้ห้ามเจอหน้า error ของเบราว์เซอร์ ("This site can't be reached")
 * ไม่ว่ากรณีใด — ถ้าต่อไม่ถึงต้องเจอหน้าแจ้งให้ต่อ VPN แทน
 *
 * พอร์ทัล (HTTPS) ยิงตรวจแอป HTTP ไม่ได้ จึงตรวจจาก IP สาธารณะของผู้ใช้ผ่าน /api/network-check
 * โดยเทียบกับชื่อ DynDNS ของบริษัทที่ admin ตั้งไว้ (ตั้งค่าองค์กร → ชื่อ DynDNS / IP สาธารณะ)
 *
 *  inside       → พาเข้าแอปทันที
 *  outside      → หน้าแจ้ง "อยู่นอกเครือข่าย ต่อ VPN ก่อน" + ปุ่มตรวจซ้ำ (ไม่มีทางไปถึง error ของเบราว์เซอร์)
 *  error        → เรียก API ไม่ได้ — แจ้งพร้อมปุ่มลองใหม่
 *  unverifiable → admin ยังไม่ตั้งค่าโฮสต์ — ตรวจให้ไม่ได้ จึงบอกให้ชัดแล้วให้ผู้ใช้ยืนยันเอง
 */

type Phase = 'loading' | 'notfound' | 'checking' | 'inside' | 'outside' | 'error' | 'unverifiable'

export function targetOf(app: AppEntry): string {
  return app.sso_url ?? app.url
}

export function LaunchApp() {
  const { slug = '' } = useParams<{ slug: string }>()
  const apps = useApps()
  const { settings } = useSettings()
  const { isAdmin } = useSession()
  const [phase, setPhase] = useState<Phase>('loading')
  const [result, setResult] = useState<NetworkCheckResult | null>(null)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  // นับครั้งที่ตรวจ + IP รอบก่อน — รอบสองขึ้นไปต้องบอกชัดว่า "ตรวจแล้ว ยังไม่พบ VPN" ไม่ใช่หน้าเดิมเงียบ ๆ
  const [attempts, setAttempts] = useState(0)
  const [previousIp, setPreviousIp] = useState<string | null>(null)

  const app = apps.data.find((a) => a.slug === slug) ?? null
  const hostsConfigured = parseHostList(settings.company_network_hosts).length > 0

  const go = useCallback((a: AppEntry) => {
    setPhase('inside')
    window.location.replace(targetOf(a))
  }, [])

  const check = useCallback(
    async (a: AppEntry) => {
      setPhase('checking')
      setErrorMsg(null)
      setAttempts((n) => n + 1)
      setPreviousIp(result?.ip ?? null)
      try {
        const r = await checkCompanyNetwork(settings.company_network_hosts)
        setResult(r)
        if (r.inside) go(a)
        else setPhase('outside')
      } catch (e) {
        setErrorMsg(e instanceof Error ? e.message : 'ตรวจสอบเครือข่ายไม่สำเร็จ')
        setPhase('error')
      }
    },
    [settings.company_network_hosts, go, result?.ip],
  )

  const outside = outsideMessage(attempts, result?.ip ?? null, previousIp)

  useEffect(() => {
    if (apps.loading) return
    if (!app) {
      setPhase('notfound')
      return
    }
    if (app.network !== 'intranet') {
      go(app)
      return
    }
    if (!hostsConfigured) {
      setPhase('unverifiable')
      return
    }
    void check(app)
    // ตั้งใจให้ทำครั้งเดียวเมื่อรู้จักแอปแล้ว — ตรวจซ้ำผ่านปุ่มเท่านั้น
  }, [apps.loading, app?.id])

  return (
    <div className="mx-auto max-w-2xl px-4 py-10 sm:px-6">
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
        {phase === 'loading' || phase === 'checking' || phase === 'inside' ? (
          <Centered
            icon={<Spinner />}
            title={
              phase === 'inside'
                ? `กำลังพาเข้า ${app?.name ?? ''}…`
                : phase === 'checking'
                  ? 'กำลังตรวจสอบว่าคุณอยู่ในเครือข่ายบริษัท…'
                  : 'กำลังโหลด…'
            }
            hint={app ? app.name : undefined}
          />
        ) : null}

        {phase === 'notfound' ? (
          <Centered
            icon={<span className="text-3xl">🔍</span>}
            title="ไม่พบแอปนี้ หรือคุณไม่มีสิทธิ์ใช้งาน"
            hint={`รหัสแอป: ${slug}`}
          >
            <BackHome />
          </Centered>
        ) : null}

        {phase === 'outside' && app ? (
          <Notice
            tone="amber"
            eyebrow={app.name}
            title={outside.title}
            body={outside.body}
            highlight={outside.retried}
            app={app}
            isAdmin={isAdmin}
            onRetry={() => void check(app)}
            result={result}
          />
        ) : null}

        {phase === 'error' && app ? (
          <Notice
            tone="rose"
            eyebrow={app.name}
            title="ตรวจสอบเครือข่ายไม่สำเร็จ"
            body={
              <>
                {errorMsg ?? 'เรียกบริการตรวจสอบไม่ได้'} — ยังไม่สามารถยืนยันได้ว่าเครื่องของคุณเข้าถึงระบบภายในอยู่
                หากอยู่นอกสำนักงาน กรุณาต่อ VPN ก่อน แล้วกดตรวจสอบอีกครั้ง
              </>
            }
            app={app}
            isAdmin={isAdmin}
            onRetry={() => void check(app)}
            result={result}
          />
        ) : null}

        {phase === 'unverifiable' && app ? (
          <Notice
            tone="blue"
            eyebrow={app.name}
            title="แอปนี้อยู่บนเครือข่ายภายในบริษัท (Intranet / LAN)"
            body={
              <>
                ต้องต่อ VPN หรือเข้าเครือข่ายของบริษัทก่อนใช้งาน — พอร์ทัลยังตรวจให้ไม่ได้ว่าเครื่องของคุณอยู่ในเครือข่ายหรือไม่
                {isAdmin ? (
                  <>
                    {' '}
                    (ผู้ดูแลระบบ: ตั้งค่า &ldquo;ชื่อ DynDNS / IP สาธารณะของบริษัท&rdquo; ในหน้าจัดการแอป → ตั้งค่าองค์กร
                    เพื่อให้ตรวจอัตโนมัติ)
                  </>
                ) : null}
              </>
            }
            app={app}
            isAdmin={isAdmin}
            result={null}
            proceedForAll
          />
        ) : null}
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------

function Notice({
  tone,
  eyebrow,
  title,
  body,
  app,
  isAdmin,
  onRetry,
  result,
  proceedForAll = false,
  highlight = false,
}: {
  tone: 'amber' | 'rose' | 'blue'
  eyebrow: string
  title: string
  body: React.ReactNode
  app: AppEntry
  isAdmin: boolean
  onRetry?: () => void
  result: NetworkCheckResult | null
  /** ไม่มีทางตรวจได้ → ทุกคนต้องยืนยันเอง (ไม่ใช่เฉพาะ admin) */
  proceedForAll?: boolean
  /** ผลตรวจซ้ำ — เน้นให้เห็นว่าหน้าเปลี่ยนแล้ว ไม่ใช่ปุ่มไม่ทำงาน */
  highlight?: boolean
}) {
  const tones = {
    amber: 'border-amber-200 bg-amber-50 text-amber-900',
    rose: 'border-rose-200 bg-rose-50 text-rose-900',
    blue: 'border-blue-200 bg-blue-50 text-blue-900',
  }
  const canProceed = proceedForAll || isAdmin

  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">{eyebrow}</p>
      <h1 className={cx('mt-1 text-xl font-bold tracking-tight', highlight ? 'text-amber-700' : 'text-slate-900')}>
        {title}
      </h1>
      <div
        role={highlight ? 'alert' : undefined}
        className={cx(
          'mt-4 rounded-xl border p-4 text-sm leading-relaxed',
          tones[tone],
          highlight && 'border-amber-400 ring-2 ring-amber-300',
        )}
      >
        {body}
      </div>

      <div className="mt-6">
        <VpnSteps />
      </div>

      <div className="mt-6 flex flex-wrap items-center gap-3">
        {onRetry ? (
          <button
            type="button"
            onClick={onRetry}
            className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700"
          >
            ต่อ VPN แล้ว ตรวจสอบอีกครั้ง
          </button>
        ) : null}
        {canProceed ? (
          <button
            type="button"
            onClick={() => window.location.replace(targetOf(app))}
            className={cx(
              'rounded-lg px-4 py-2 text-sm font-semibold transition',
              proceedForAll
                ? 'bg-blue-600 text-white shadow-sm hover:bg-blue-700'
                : 'border border-slate-300 text-slate-700 hover:bg-slate-50',
            )}
          >
            {proceedForAll ? 'อยู่ในเครือข่ายแล้ว เปิดเลย' : 'เปิดต่อไปเลย (ผู้ดูแลระบบ)'}
          </button>
        ) : null}
        <BackHome />
      </div>

      {isAdmin && result ? (
        <details className="mt-4 text-xs text-slate-400">
          <summary className="cursor-pointer">รายละเอียดการตรวจ (ผู้ดูแลระบบ)</summary>
          <pre className="mt-2 overflow-x-auto rounded-lg bg-slate-50 p-3 text-[11px] leading-relaxed">
            {JSON.stringify(result, null, 2)}
          </pre>
        </details>
      ) : null}

      <div className="mt-6">
        <HelpdeskNote />
      </div>
    </div>
  )
}

function Centered({
  icon,
  title,
  hint,
  children,
}: {
  icon: React.ReactNode
  title: string
  hint?: string
  children?: React.ReactNode
}) {
  return (
    <div className="flex flex-col items-center py-8 text-center">
      <div className="grid h-14 w-14 place-items-center rounded-2xl bg-slate-100">{icon}</div>
      <h1 className="mt-4 text-lg font-semibold text-slate-900">{title}</h1>
      {hint ? <p className="mt-1 text-sm text-slate-500">{hint}</p> : null}
      {children ? <div className="mt-5">{children}</div> : null}
    </div>
  )
}

function BackHome() {
  return (
    <Link
      to="/"
      className="rounded-lg px-4 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-100"
    >
      กลับหน้าหลัก
    </Link>
  )
}

function Spinner() {
  return (
    <span className="h-6 w-6 animate-spin rounded-full border-2 border-slate-300 border-t-blue-600" aria-hidden />
  )
}
