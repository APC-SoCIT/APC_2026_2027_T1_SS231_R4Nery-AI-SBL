'use client'

/**
 * app/sign-in/page.tsx  — Phase 2: Mall Goer Login
 *
 * Auth method: Philippine mobile number + password.
 * Google OAuth offered as alternative.
 * "Forgot password?" triggers SMS OTP reset flow.
 *
 * Preserves the existing authpage-signin UI/UX (pale blue bg, mascot header,
 * gold submit button) while replacing email with phone number.
 */
import { useState, type FormEvent } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { AuthMascotHeader } from '@/components/auth/auth-mascot-header'
import { GoogleIcon } from '@/components/auth/social-icons'
import { createClient } from '@/lib/supabase/client'
import { toE164, phoneError } from '@/lib/phoneUtils'
import { mockSignIn } from '@/lib/mock-auth'

// Error code → user-friendly message (design doc §12)
const SUPABASE_ERRORS: Record<string, string> = {
  invalid_credentials: 'Incorrect mobile number or password.',
  phone_not_confirmed: 'Please verify your mobile number first.',
  over_request_rate_limit: 'Too many attempts. Please wait a moment before trying again.',
}

function mapError(code: string | undefined, message: string): string {
  if (code && SUPABASE_ERRORS[code]) return SUPABASE_ERRORS[code]
  return message
}

const SUPABASE_CONFIGURED =
  typeof process !== 'undefined' &&
  !!process.env.NEXT_PUBLIC_SUPABASE_URL &&
  !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

export default function SignInPage() {
  const router = useRouter()
  const [phone, setPhone] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [resetSent, setResetSent] = useState(false)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError('')

    const pErr = phoneError(phone)
    if (pErr) { setError(pErr); return }

    setSubmitting(true)
    try {
      if (!SUPABASE_CONFIGURED) {
        // Dev fallback — mock-auth still uses email; pass phone as "email"
        const result = mockSignIn(phone, password)
        if (!result.ok) { setError(result.error); return }
        router.push(result.user.role === 'admin' ? '/admin' : '/home')
        return
      }

      const e164 = toE164(phone)!
      const supabase = createClient()
      const { error: sbError } = await supabase.auth.signInWithPassword({
        phone: e164,
        password,
      })

      if (sbError) {
        setError(mapError((sbError as { code?: string }).code, sbError.message))
        return
      }

      router.push('/home')
    } finally {
      setSubmitting(false)
    }
  }

  async function handleForgotPassword() {
    setError('')
    const pErr = phoneError(phone)
    if (pErr) {
      setError('Enter your mobile number above first, then tap "Forgot password?".')
      return
    }
    if (!SUPABASE_CONFIGURED) return

    const e164 = toE164(phone)!
    const supabase = createClient()
    const { error: sbError } = await supabase.auth.signInWithOtp({ phone: e164 })
    if (sbError) {
      setError(mapError((sbError as { code?: string }).code, sbError.message))
      return
    }
    setResetSent(true)
    router.push(
      `/auth/verify-otp?phone=${encodeURIComponent(e164)}&mode=reset`
    )
  }

  async function handleGoogle() {
    if (!SUPABASE_CONFIGURED) return
    const supabase = createClient()
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    })
  }

  return (
    <main className="authpage authpage-signin">
      <AuthMascotHeader backHref="/get-started" variant="signin" />
      <form className="authpage-body" onSubmit={handleSubmit} noValidate>
        <h2>
          Hey There,
          <br />
          You&apos;re Back!
        </h2>

        <label className="sr-only" htmlFor="signin-phone">
          Mobile Number
        </label>
        <div className="authpage-phone-wrap authpage-phone-wrap-signin">
          <span className="authpage-phone-prefix authpage-phone-prefix-signin" aria-hidden="true">🇵🇭 +63</span>
          <input
            id="signin-phone"
            className="authpage-field authpage-field-phone authpage-field-signin"
            type="tel"
            placeholder="917 123 4567"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            autoComplete="tel"
            inputMode="tel"
          />
        </div>

        <label className="sr-only" htmlFor="signin-password">
          Password
        </label>
        <input
          id="signin-password"
          className="authpage-field authpage-field-signin"
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoComplete="current-password"
        />

        {error && (
          <p className="authpage-error" role="alert">
            {error}
          </p>
        )}

        {resetSent && (
          <p className="authpage-info" role="status">
            A reset code was sent to your mobile number.
          </p>
        )}

        <p className="authpage-links">
          <button
            type="button"
            className="authpage-link-btn"
            onClick={handleForgotPassword}
          >
            I forgot my <u>password</u>
          </button>
        </p>
        <p className="authpage-links">
          Don&apos;t have an account?{' '}
          <Link href="/sign-up">
            <strong>Make one</strong>
          </Link>
        </p>

        <div className="authpage-socials">
          <button
            type="button"
            className="authpage-social authpage-social-google"
            onClick={handleGoogle}
          >
            <GoogleIcon /> Continue with Google
          </button>
        </div>

        <button
          type="submit"
          className="authpage-submit authpage-submit-gold"
          disabled={submitting}
          aria-busy={submitting}
        >
          {submitting ? 'Signing in…' : 'Login'}
        </button>
      </form>
    </main>
  )
}