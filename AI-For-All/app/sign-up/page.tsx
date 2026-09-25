'use client'

/**
 * app/sign-up/page.tsx
 *
 * Auth method: email + password.
 * Google OAuth remains available as an alternative one-tap sign-up.
 */
import { useState, type FormEvent } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { AuthMascotHeader } from '@/components/auth/auth-mascot-header'
import { GoogleIcon } from '@/components/auth/social-icons'
import { createClient } from '@/lib/supabase/client'
import { mockSignUp, shouldUseMockAuth } from '@/lib/mock-auth'

const SUPABASE_ERRORS: Record<string, string> = {
  user_already_exists: 'An account with this email already exists.',
  weak_password: 'Password doesn\'t meet the minimum requirements.',
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

// Letters and numbers only — no symbols/spaces.
const PASSWORD_PATTERN = /^[A-Za-z0-9]+$/

export default function SignUpPage() {
  const router = useRouter()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [agreedToTerms, setAgreedToTerms] = useState(false)
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const passwordsMatch = confirmPassword === '' || password === confirmPassword
  const passwordValid = password === '' || (password.length >= 8 && PASSWORD_PATTERN.test(password))
  const ready =
    name.trim().length > 0 &&
    email.trim().length > 0 &&
    password.length >= 8 &&
    PASSWORD_PATTERN.test(password) &&
    confirmPassword.length > 0 &&
    password === confirmPassword &&
    agreedToTerms

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError('')

    const trimmedEmail = email.trim()
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
      setError('Enter a valid email address.')
      return
    }
    if (password.length < 8) { setError('Password must be at least 8 characters.'); return }
    if (!PASSWORD_PATTERN.test(password)) {
      setError('Password can only contain letters and numbers — no symbols or spaces.')
      return
    }
    if (password !== confirmPassword) { setError('Passwords do not match.'); return }
    if (!agreedToTerms) { setError('Please agree to the Terms and Conditions to continue.'); return }

    setSubmitting(true)
    try {
      // Use mock auth only under the same conditions sign-in uses it
      // (no Supabase env vars, or running on localhost). Previously this
      // page fell back to mock auth any time env vars were missing,
      // regardless of host — inconsistent with sign-in and a source of
      // confusing "wrong account" behaviour on deployed environments.
      if (!SUPABASE_CONFIGURED || shouldUseMockAuth()) {
        const result = mockSignUp(name, trimmedEmail, password)
        if (!result.ok) { setError(result.error); return }
        router.push('/home')
        return
      }

      const supabase = createClient()

      // Clear out any previously-active session BEFORE creating a new
      // account. Without this, if email confirmation is required and the
      // confirmation email never arrives (e.g. no SMTP configured), the
      // old session just keeps sitting there — so /home silently keeps
      // showing whoever was last actually signed in, no matter which new
      // account you just tried to create.
      await supabase.auth.signOut()

      const { data: signUpData, error: sbError } = await supabase.auth.signUp({
        email: trimmedEmail,
        password,
        options: {
          data: { name: name.trim() },
          // Without this, Supabase falls back to whatever "Site URL" is
          // set in the dashboard — which is why confirmation links were
          // opening localhost even from the deployed site. This makes the
          // link always point back at wherever the sign-up actually
          // happened (localhost in dev, your real domain in prod).
          //
          // IMPORTANT: this only works if that exact URL is also added to
          // Supabase Dashboard → Authentication → URL Configuration →
          // Redirect URLs — Supabase rejects redirects that aren't on the
          // allow list, regardless of what's passed here.
          emailRedirectTo: `${window.location.origin}/auth/callback`,
        },
      })

      if (sbError) {
        setError(mapError((sbError as { code?: string }).code, sbError.message))
        return
      }

      // If email confirmation is OFF in Supabase (common for dev/testing
      // without SMTP set up), signUp() returns an active session right
      // away — skip the "check your inbox" screen and go straight in.
      if (signUpData.session) {
        router.push('/home')
        return
      }

      // Otherwise Supabase is waiting on a confirmation email/link.
      // Redirect to the "check your inbox" screen so they know what to do next.
      router.push(`/auth/check-email?email=${encodeURIComponent(trimmedEmail)}`)
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

        <label className="sr-only" htmlFor="signup-email">
          Email Address
        </label>
        <input
          id="signup-email"
          className="authpage-field"
          type="email"
          placeholder="you@example.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          autoComplete="email"
          inputMode="email"
        />

        <label className="sr-only" htmlFor="signup-password">
          Password
        </label>
        <input
          id="signup-password"
          className={`authpage-field${!passwordValid ? ' authpage-field--error' : ''}`}
          type="password"
          placeholder="Password (8+ characters)"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoComplete="new-password"
        />
        <p className="authpage-password-hint">
          8+ characters, letters and numbers only (no symbols or spaces).
        </p>
        {!passwordValid && (
          <p className="authpage-field-hint" role="alert">
            Letters and numbers only — no symbols or spaces.
          </p>
        )}

        <label className="sr-only" htmlFor="signup-confirm-password">
          Confirm Password
        </label>
        <input
          id="signup-confirm-password"
          className={`authpage-field${!passwordsMatch ? ' authpage-field--error' : ''}`}
          type="password"
          placeholder="Confirm Password"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          autoComplete="new-password"
        />
        {!passwordsMatch && (
          <p className="authpage-field-hint" role="alert">Passwords don&apos;t match.</p>
        )}

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

        <div className="authpage-terms">
          <input
            id="signup-terms"
            type="checkbox"
            checked={agreedToTerms}
            onChange={(e) => setAgreedToTerms(e.target.checked)}
          />
          <label htmlFor="signup-terms">
            I have read and agree to the{' '}
            <Link href="/terms" target="_blank" rel="noreferrer">
              Terms and Conditions and Privacy Notice
            </Link>{' '}
            of the AI for ALL – Story-Based Learning System.
          </label>
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
          {submitting ? 'Creating account…' : "I'm Ready"}
        </button>
      </form>
    </main>
  )
}