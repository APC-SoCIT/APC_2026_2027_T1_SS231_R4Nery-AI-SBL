'use client'

/**
 * app/sign-in/page.tsx
 *
 * Auth method: email + password.
 * Google OAuth remains available as an alternative.
 */
import { useState, type FormEvent } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { AuthMascotHeader } from '@/components/auth/auth-mascot-header'
import { GoogleIcon } from '@/components/auth/social-icons'
import { createClient } from '@/lib/supabase/client'
import { isMockEmail, mockSignIn, shouldUseMockAuth } from '@/lib/mock-auth'

const SUPABASE_ERRORS: Record<string, string> = {
  invalid_credentials: 'Incorrect email or password.',
  email_not_confirmed: 'Please verify your email first.',
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
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [resetSent, setResetSent] = useState(false)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError('')

    const trimmedEmail = email.trim()
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
      setError('Enter a valid email address.')
      return
    }

    setSubmitting(true)
    try {
      const useMock = !SUPABASE_CONFIGURED || shouldUseMockAuth() || isMockEmail(trimmedEmail)
      if (useMock) {
        const result = mockSignIn(trimmedEmail, password)
        if (!result.ok) { setError(result.error); return }
        router.push(result.user.role === 'admin' ? '/admin' : '/home')
        return
      }

      const supabase = createClient()
      const { error: sbError } = await supabase.auth.signInWithPassword({
        email: trimmedEmail,
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
    const trimmedEmail = email.trim()
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
      setError('Enter your email above first, then tap "Forgot password?".')
      return
    }
    if (!SUPABASE_CONFIGURED && !shouldUseMockAuth() && !isMockEmail(trimmedEmail)) return

    if (shouldUseMockAuth() || isMockEmail(trimmedEmail)) {
      setResetSent(true)
      router.push(`/auth/verify-otp?email=${encodeURIComponent(trimmedEmail)}&mode=reset`)
      return
    }

    const supabase = createClient()
    const { error: sbError } = await supabase.auth.signInWithOtp({ email: trimmedEmail })
    if (sbError) {
      setError(mapError((sbError as { code?: string }).code, sbError.message))
      return
    }
    setResetSent(true)
    router.push(`/auth/verify-otp?email=${encodeURIComponent(trimmedEmail)}&mode=reset`)
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

        <label className="sr-only" htmlFor="signin-email">
          Email
        </label>
        <input
          id="signin-email"
          className="authpage-field authpage-field-signin"
          type="email"
          placeholder="you@example.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          autoComplete="email"
          inputMode="email"
        />

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
            A reset code was sent to your email.
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