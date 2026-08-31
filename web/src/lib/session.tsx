import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { Auth0Provider, useAuth0 } from '@auth0/auth0-react'
import { env, isLive } from './env'
import { api } from './api'
import { setAccessTokenProvider } from './supabase'
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
}

const SessionContext = createContext<Session | null>(null)

export function useSession(): Session {
  const ctx = useContext(SessionContext)
  if (!ctx) throw new Error('useSession ต้องอยู่ภายใน <SessionProvider>')
  return ctx
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
        if (!cancelled) setError(e instanceof Error ? e.message : String(e))
      })
      .finally(() => {
        if (!cancelled) setSyncing(false)
      })
    return () => {
      cancelled = true
    }
  }, [isAuthenticated, user])

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
      logout: () => void auth0Logout({ logoutParams: { returnTo: window.location.origin } }),
    }),
    [authLoading, syncing, isAuthenticated, profile, error, authError, loginWithRedirect, auth0Logout],
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
    }),
    [signedIn],
  )

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>
}

// -----------------------------------------------------------------------------
export function SessionProvider({ children }: { children: ReactNode }) {
  if (!isLive) return <DemoSession>{children}</DemoSession>

  return (
    <Auth0Provider
      domain={env.auth0.domain}
      clientId={env.auth0.clientId}
      authorizationParams={{
        redirect_uri: window.location.origin,
        audience: env.auth0.audience,
        scope: 'openid profile email',
      }}
      cacheLocation="localstorage"
      useRefreshTokens
    >
      <LiveSession>{children}</LiveSession>
    </Auth0Provider>
  )
}
