export type MockUser = { name: string; email: string; role: 'registered' | 'admin' }

type MockAccount = { email: string; password: string; name: string; role: MockUser['role'] }

const MOCK_ACCOUNTS: MockAccount[] = [
  { email: 'user@aiforall.test', password: 'user', name: 'Test User', role: 'registered' },
  { email: 'admin@aiforall.test', password: 'admin', name: 'Test Admin', role: 'admin' },
]

const STORAGE_KEY = 'ai-for-all:mock-session'
const PASSWORD_OVERRIDES_KEY = 'ai-for-all:mock-passwords'

export function isMockEmail(email: string): boolean {
  // When Supabase is configured, these accounts exist as real auth users — don't mock them
  if (process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) return false
  const normalized = email.trim().toLowerCase()
  return MOCK_ACCOUNTS.some((account) => account.email.toLowerCase() === normalized)
}

export function shouldUseMockAuth(): boolean {
  if (typeof window === 'undefined') return false
  // Only use mock auth if Supabase is NOT configured.
  // When Supabase is configured (even on localhost), use real auth
  // so server-side API routes can see the authenticated session.
  if (process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) return false
  const host = window.location.hostname
  return host === 'localhost' || host === '127.0.0.1' || host.startsWith('localhost.')
}

/** Read any password overrides stored in localStorage */
function getPasswordOverrides(): Record<string, string> {
  if (typeof window === 'undefined') return {}
  try {
    const raw = window.localStorage.getItem(PASSWORD_OVERRIDES_KEY)
    return raw ? JSON.parse(raw) : {}
  } catch {
    return {}
  }
}

export function mockSignIn(email: string, password: string): { ok: true; user: MockUser } | { ok: false; error: string } {
  const normalized = email.trim().toLowerCase()
  const match = MOCK_ACCOUNTS.find(
    (a) => a.email.toLowerCase() === normalized
  )
  if (!match) return { ok: false, error: 'Email or password is incorrect.' }

  // Check localStorage override first, fall back to default hardcoded password
  const overrides = getPasswordOverrides()
  const effectivePassword = overrides[normalized] ?? match.password

  if (effectivePassword !== password) {
    return { ok: false, error: 'Email or password is incorrect.' }
  }

  const user: MockUser = { name: match.name, email: match.email, role: match.role }
  if (typeof window !== 'undefined') window.localStorage.setItem(STORAGE_KEY, JSON.stringify(user))
  return { ok: true, user }
}

export function mockSignUp(name: string, email: string, password: string): { ok: true; user: MockUser } | { ok: false; error: string } {
  if (!name.trim()) return { ok: false, error: 'Please enter your name.' }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) return { ok: false, error: 'Please enter a valid email address.' }
  if (password.length < 8) return { ok: false, error: 'Password must be at least 8 characters.' }
  const user: MockUser = { name: name.trim(), email: email.trim(), role: 'registered' }
  if (typeof window !== 'undefined') window.localStorage.setItem(STORAGE_KEY, JSON.stringify(user))
  return { ok: true, user }
}

export function getMockSession(): MockUser | null {
  if (typeof window === 'undefined') return null
  // If we shouldn't use mock auth (e.g. Supabase is configured), clear any stale session
  if (!shouldUseMockAuth() && !isMockEmail(getMockEmailSafely())) {
    clearMockSession()
    return null
  }
  const raw = window.localStorage.getItem(STORAGE_KEY)
  return raw ? (JSON.parse(raw) as MockUser) : null
}

function getMockEmailSafely(): string {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (raw) return (JSON.parse(raw) as MockUser).email || ''
  } catch {}
  return ''
}

export function updateMockSession(updates: Partial<MockUser>): MockUser | null {
  if (typeof window === 'undefined') return null
  const current = getMockSession()
  if (current) {
    const updated = { ...current, ...updates }
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(updated))
    return updated
  }
  return null
}

export function clearMockSession() {
  if (typeof window !== 'undefined') window.localStorage.removeItem(STORAGE_KEY)
}

/** Persist a new password for a mock account so future logins use it. */
export function updateMockPassword(newPassword: string): boolean {
  if (typeof window === 'undefined') return false
  const session = getMockSession()
  if (!session) return false
  const overrides = getPasswordOverrides()
  overrides[session.email.toLowerCase()] = newPassword
  window.localStorage.setItem(PASSWORD_OVERRIDES_KEY, JSON.stringify(overrides))
  return true
}