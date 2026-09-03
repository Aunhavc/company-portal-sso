import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { Auth0Provider, useAuth0 } from '@auth0/auth0-react'
import { env, isLive } from './env'
import { buildAuth0Options, clearAuth0Cache } from './auth0Config'
import { api } from './api'
import { setAccessTokenProvider, peekTokenError, clearTokenError } from './supabase'
import { demoProfile } from './demoStore'
import type { Profile } from './types'

/**
 * ชั้นเซสชันกลาง — ปิดทับความต่างระหว่าง "โหมดจริง (Auth0)" กับ "โหมดสาธิต"
 * คอมโพเนนต์ทั้งหมดเรียก useSession() ตัวเดียว ไม่ต้องรู้ว่าอยู่โหมดไหน
 */

export interface Session {
  mode: 'live' | 'demo'
  isLoading: boolean
  isAuthenticated: boolean
  profile: Profile | null
  isAdmin: boolean
  error: string | null
  login: () => void
  logout: () => void
  /** ล้างแคชโทเคนที่ค้างแล้วพาไปล็อกอินใหม่ — ใช้กู้เมื่อโทเคนใช้ต่อไม่ได้ */
  relogin: () => void
  /** true = สาเหตุที่พังคือขอโทเคนไม่ได้ กู้ได้ด้วยการล็อกอินใหม่ */
  needsReauth: boolean
}

const SessionContext = createContext<Session | null>(null)

export function useSession(): Session {
  const ctx = useContext(SessionContext)
  if (!ctx) throw new Error('useSession ต้องอยู่ภายใน <SessionProvider>')
  return ctx
}

const AUTO_RECOVERY_KEY = 'portal.autoRecovered'

function hasTriedAutoRecovery(): boolean {
  try {
    return sessionStorage.getItem(AUTO_RECOVERY_KEY) === '1'
  } catch {
    return true // แตะ sessionStorage ไม่ได้ = อย่ากู้อัตโนมัติ กันวนซ้ำไม่รู้จบ
  }
}

function markAutoRecoveryTried(): void {
  try {
    sessionStorage.setItem(AUTO_RECOVERY_KEY, '1')
  } catch {
    /* ไม่เป็นไร ผู้ใช้ยังกดปุ่มเข้าสู่ระบบใหม่เองได้ */
  }
}

// -----------------------------------------------------------------------------
// โหมดจริง
// -----------------------------------------------------------------------------
function LiveSession({ children }: { children: ReactNode }) {
  const {
    isLoading: authLoading,
    isAuthenticated,
    user,
    error: authError,
    loginWithRedirect,
    logout: auth0Logout,
    getAccessTokenSilently,
  } = useAuth0()

  const [profile, setProfile] = useState<Profile | null>(null)
  const [syncing, setSyncing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [needsReauth, setNeedsReauth] = useState(false)

  const relogin = useCallback(() => {
    clearAuth0Cache()
    clearTokenError()
    void loginWithRedirect({
      authorizationParams: env.auth0.connection ? { connection: env.auth0.connection } : undefined,
    })
  }, [loginWithRedirect])

  // ส่งวิธีขอ access token ให้ supabase client ใช้แนบไปกับทุก request
  useEffect(() => {
    setAccessTokenProvider(async () => getAccessTokenSilently())
    return () => setAccessTokenProvider(null)
  }, [getAccessTokenSilently])

  // ซิงค์โปรไฟล์ลง Supabase หลังล็อกอินสำเร็จ
  useEffect(() => {
    if (!isAuthenticated || !user) return
    let cancelled = false
    setSyncing(true)
    api
      .syncProfile(user.name ?? user.nickname ?? null, user.picture ?? null)
      .then((p) => {
        if (!cancelled) {
          setProfile(p)
          setError(null)
        }
      })
      .catch((e: unknown) => {
        if (cancelled) return
        setError(e instanceof Error ? e.message : String(e))

        // แคชโทเคนค้างในสภาพที่ใช้ต่อไม่ได้ — ล้างแล้วพาไปล็อกอินใหม่ให้เอง
        // กันวนซ้ำด้วยธงใน sessionStorage: กู้อัตโนมัติได้ครั้งเดียวต่อแท็บ
        if (peekTokenError()) {
          setNeedsReauth(true)
          if (!hasTriedAutoRecovery()) {
            markAutoRecoveryTried()
            relogin()
          }
        }
      })
      .finally(() => {
        if (!cancelled) setSyncing(false)
      })
    return () => {
      cancelled = true
    }
  }, [isAuthenticated, user, relogin])

  const value = useMemo<Session>(
    () => ({
      mode: 'live',
      isLoading: authLoading || syncing,
      isAuthenticated,
      profile,
      isAdmin: profile?.role === 'admin',
      error: error ?? authError?.message ?? null,
      login: () =>
        void loginWithRedirect({
          authorizationParams: env.auth0.connection
            ? { connection: env.auth0.connection }
            : undefined,
        }),
      logout: () => {
        clearAuth0Cache()
        void auth0Logout({ logoutParams: { returnTo: window.location.origin } })
      },
      relogin,
      needsReauth,
    }),
    [
      authLoading,
      syncing,
      isAuthenticated,
      profile,
      error,
      authError,
      loginWithRedirect,
      auth0Logout,
      relogin,
      needsReauth,
    ],
  )

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>
}

// -----------------------------------------------------------------------------
// โหมดสาธิต — ล็อกอินอัตโนมัติด้วยผู้ใช้จำลอง
// -----------------------------------------------------------------------------
const DEMO_KEY = 'portal.demo.signedIn'

function DemoSession({ children }: { children: ReactNode }) {
  const [signedIn, setSignedIn] = useState(
    () => (typeof localStorage !== 'undefined' ? localStorage.getItem(DEMO_KEY) !== '0' : true),
  )

  const value = useMemo<Session>(
    () => ({
      mode: 'demo',
      isLoading: false,
      isAuthenticated: signedIn,
      profile: signedIn ? demoProfile : null,
      isAdmin: signedIn && demoProfile.role === 'admin',
      error: null,
      login: () => {
        localStorage.setItem(DEMO_KEY, '1')
        setSignedIn(true)
      },
      logout: () => {
        localStorage.setItem(DEMO_KEY, '0')
        setSignedIn(false)
      },
      relogin: () => {
        localStorage.setItem(DEMO_KEY, '1')
        setSignedIn(true)
      },
      needsReauth: false,
    }),
    [signedIn],
  )

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>
}

// -----------------------------------------------------------------------------
export function SessionProvider({ children }: { children: ReactNode }) {
  if (!isLive) return <DemoSession>{children}</DemoSession>

  return (
    <Auth0Provider {...buildAuth0Options(window.location.origin)}>
      <LiveSession>{children}</LiveSession>
    </Auth0Provider>
  )
}
