'use client'

/**
 * app/sign-up/page.tsx  — Phase 2: Mall Goer Registration
 *
 * Auth method: Philippine mobile number + password, confirmed via SMS OTP.
 * Google OAuth is offered as an alternative one-tap sign-up.
 *
 * Flow (phone path):
 *   1. User enters name, phone (+63…), password
 *   2. supabase.auth.signUp({ phone, password, options: { data: { name } } })
 *   3. Redirect to /auth/verify-otp with phone in query params
 *
 * Flow (Google path):
 *   1. User taps "Continue with Google"
 *   2. supabase.auth.signInWithOAuth({ provider: 'google' })
 *   3. Google consent → /auth/callback → /home
 *
 * Preserves the existing authpage UI/UX (dark blue bg, mascot header,
 * yellow submit button) while replacing email with phone number.
 */
import { useState, type FormEvent } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { AuthMascotHeader } from '@/components/auth/auth-mascot-header'
import { GoogleIcon } from '@/components/auth/social-icons'
import { createClient } from '@/lib/supabase/client'
import { toE164, phoneError } from '@/lib/phoneUtils'
import { mockSignUp } from '@/lib/mock-auth'

// Error code → user-friendly message (design doc §12)
const SUPABASE_ERRORS: Record<string, string> = {
  user_already_exists: 'An account with this mobile number already exists.',
  weak_password: 'Password doesn\'t meet the minimum requirements.',
  over_request_rate_limit: 'Too many attempts. Please wait a moment before trying again.',
  sms_send_failed: 'We couldn\'t send a code to that number. Please check it and try again.',
}

function mapError(code: string | undefined, message: string): string {
  if (code && SUPABASE_ERRORS[code]) return SUPABASE_ERRORS[code]
  return message
}

const SUPABASE_CONFIGURED =
  typeof process !== 'undefined' &&
  !!process.env.NEXT_PUBLIC_SUPABASE_URL &&
  !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

export default function SignUpPage() {
  const router = useRouter()
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const ready =
    name.trim().length > 0 && phone.trim().length > 0 && password.length > 0

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError('')

    // Client-side phone validation
    const pErr = phoneError(phone)
    if (pErr) { setError(pErr); return }
    if (password.length < 8) { setError('Password must be at least 8 characters.'); return }

    setSubmitting(true)
    try {
      if (!SUPABASE_CONFIGURED) {
        // Dev fallback (no .env.local)
        const result = mockSignUp(name, phone, password)
        if (!result.ok) { setError(result.error); return }
        router.push('/home')
        return
      }

      const e164 = toE164(phone)!
      const supabase = createClient()
      const { error: sbError } = await supabase.auth.signUp({
        phone: e164,
        password,
        options: { data: { name: name.trim() } },
      })

      if (sbError) {
        setError(mapError((sbError as { code?: string }).code, sbError.message))
        return
      }

      // SMS OTP sent — proceed to verification
      router.push(`/auth/verify-otp?phone=${encodeURIComponent(e164)}`)
    } finally {
      setSubmitting(false)
    }
  }

  async function handleGoogle() {
    if (!SUPABASE_CONFIGURED) return
    const supabase = createClient()
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    })
  }

  return (
    <main className="authpage authpage-signup">
      <AuthMascotHeader backHref="/get-started" variant="signup" />
      <form className="authpage-body" onSubmit={handleSubmit} noValidate>
        <h2>
          Ready to
          <br />
          Learn AI?
        </h2>

        <label className="sr-only" htmlFor="signup-name">
          Your Name
        </label>
        <input
          id="signup-name"
          className="authpage-field"
          placeholder="Your Name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          autoComplete="name"
        />

        <label className="sr-only" htmlFor="signup-phone">
          Mobile Number
        </label>
        <div className="authpage-phone-wrap">
          <span className="authpage-phone-prefix" aria-hidden="true">🇵🇭 +63</span>
          <input
            id="signup-phone"
            className="authpage-field authpage-field-phone"
            type="tel"
            placeholder="917 123 4567"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            autoComplete="tel"
            inputMode="tel"
          />
        </div>

        <label className="sr-only" htmlFor="signup-password">
          Password
        </label>
        <input
          id="signup-password"
          className="authpage-field"
          type="password"
          placeholder="Password (8+ characters)"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoComplete="new-password"
        />

        {error && (
          <p className="authpage-error" role="alert">
            {error}
          </p>
        )}

        <div className="authpage-socials">
          <button
            type="button"
            className="authpage-social authpage-social-google"
            onClick={handleGoogle}
          >
            <GoogleIcon /> Continue with Google
          </button>
        </div>

        <p className="authpage-links">
          <Link href="/sign-in">
            Already have an account? <strong>Sign in</strong>
          </Link>
        </p>

        <button
          type="submit"
          className={`authpage-submit${ready ? ' is-ready' : ''}`}
          disabled={!ready || submitting}
          aria-busy={submitting}
        >
          {submitting ? 'Sending code…' : "I'm Ready"}
        </button>
      </form>
    </main>
  )
}