export type MockUser = { name: string; email: string; role: 'registered' | 'admin' }

type MockAccount = { email: string; password: string; name: string; role: MockUser['role'] }

const MOCK_ACCOUNTS: MockAccount[] = [
  { email: 'user@aiforall.test', password: 'User123!', name: 'Registered Learner', role: 'registered' },
  { email: 'admin@aiforall.test', password: 'Admin123!', name: 'Admin', role: 'admin' },
]

const STORAGE_KEY = 'ai-for-all:mock-session'

export function isMockEmail(email: string): boolean {
  const normalized = email.trim().toLowerCase()
  return MOCK_ACCOUNTS.some((account) => account.email.toLowerCase() === normalized)
}

export function shouldUseMockAuth(): boolean {
  if (typeof window === 'undefined') return false
  const host = window.location.hostname
  return host === 'localhost' || host === '127.0.0.1' || host.startsWith('localhost.')
}

export function mockSignIn(email: string, password: string): { ok: true; user: MockUser } | { ok: false; error: string } {
  const match = MOCK_ACCOUNTS.find(
    (a) => a.email.toLowerCase() === email.trim().toLowerCase() && a.password === password
  )
  if (!match) return { ok: false, error: 'Email or password is incorrect.' }
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
  const raw = window.localStorage.getItem(STORAGE_KEY)
  return raw ? (JSON.parse(raw) as MockUser) : null
}

export function clearMockSession() {
  if (typeof window !== 'undefined') window.localStorage.removeItem(STORAGE_KEY)
}