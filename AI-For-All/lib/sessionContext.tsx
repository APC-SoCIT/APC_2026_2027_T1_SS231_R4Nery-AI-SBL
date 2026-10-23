'use client'

/**
 * lib/sessionContext.tsx
 *
 * React context that makes the Supabase session + derived UserSession
 * available throughout the client tree.
 *
 * Derives:
 *   isGuest      ← user.is_anonymous
 *   authMethod   ← user.identities[0].provider ('phone' | 'google' | null)
 *   phoneVerified← user.phone_confirmed_at !== null
 *
 * The SessionProvider should be mounted once in app/layout.tsx.
 * All client components can call `useSession()` to access the session.
 */
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import type { User } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/client'
import type { UserSession } from '@/lib/types'

// ─── Context shape ────────────────────────────────────────────────────────────

interface SessionContextValue {
  /** Null while loading, populated once Supabase responds. */
  session: UserSession | null
  /** True during the initial auth check. */
  loading: boolean
  /** Convenience alias for session?.isGuest ?? true */
  isGuest: boolean
}

const SessionContext = createContext<SessionContextValue>({
  session: null,
  loading: true,
  isGuest: true,
})

// ─── Helpers ──────────────────────────────────────────────────────────────────

function deriveAuthMethod(user: User): UserSession['authMethod'] {
  if (!user.identities || user.identities.length === 0) return null
  const provider = user.identities[0].provider
  if (provider === 'google') return 'google'
  if (provider === 'email') return 'email'
  return 'email' // default for any other email-based provider
}

function buildSession(user: User, role?: string): UserSession {
  const isGuest = user.is_anonymous ?? false
  return {
    sessionId: user.id,
    userId: user.id,
    isGuest,
    role: (role as UserSession['role']) || (isGuest ? 'guest' : 'user'),
    authMethod: deriveAuthMethod(user),
    emailVerified: user.email_confirmed_at !== null && user.email_confirmed_at !== undefined,
    completedModules: [],
    unlockedBadges: [],
    claimedRewards: [],
    createdAt: new Date(user.created_at),
    lastUpdatedAt: new Date(user.updated_at ?? user.created_at),
  }
}

// ─── Provider ─────────────────────────────────────────────────────────────────

export function SessionProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<UserSession | null>(null)
  const [loading, setLoading] = useState(true)
  // Remember the last known role so auth-state events don't reset it to default
  const roleRef = useRef<string | undefined>(undefined)

  const refresh = useCallback(async () => {
    // Supabase may not be configured in dev (no .env.local) — skip gracefully
    if (
      !process.env.NEXT_PUBLIC_SUPABASE_URL ||
      !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    ) {
      setLoading(false)
      return
    }

    const supabase = createClient()

    // getSession() reads the locally stored session (no network round trip),
    // so the UI can render immediately. Server-side routes and the proxy still
    // verify the user with getUser(), so this is only used for UI state.
    const {
      data: { session: authSession },
    } = await supabase.auth.getSession()
    const user = authSession?.user ?? null

    if (user) {
      // Render right away with the default role, then upgrade it once the
      // role lookup returns — the role query no longer blocks first paint.
      setSession(buildSession(user, roleRef.current))
      setLoading(false)

      const { data: userRow } = await supabase
        .from('users')
        .select('role')
        .eq('user_id', user.id)
        .maybeSingle()

      if (userRow?.role) {
        roleRef.current = userRow.role
        setSession(buildSession(user, userRow.role))
      }
    } else {
      setSession(null)
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    refresh()

    if (
      !process.env.NEXT_PUBLIC_SUPABASE_URL ||
      !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    ) {
      return
    }

    const supabase = createClient()

    // Stay in sync across tabs / token refreshes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(s?.user ? buildSession(s.user, roleRef.current) : null)
      setLoading(false)
    })

    return () => subscription.unsubscribe()
  }, [refresh])

  const value: SessionContextValue = {
    session,
    loading,
    isGuest: session?.isGuest ?? true,
  }

  return (
    <SessionContext.Provider value={value}>{children}</SessionContext.Provider>
  )
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

/** Access the current Supabase-derived session from any client component. */
export function useSession() {
  return useContext(SessionContext)
}
