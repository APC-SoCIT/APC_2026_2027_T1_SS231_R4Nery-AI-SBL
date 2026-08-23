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
import { mockSignUp } from '@/lib/mock-auth'

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

export default function SignUpPage() {
  const router = useRouter()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const ready =
    name.trim().length > 0 && email.trim().length > 0 && password.length > 0

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError('')

    const trimmedEmail = email.trim()
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
      setError('Enter a valid email address.')
      return
    }
    if (password.length < 8) { setError('Password must be at least 8 characters.'); return }

    setSubmitting(true)
    try {
      if (!SUPABASE_CONFIGURED) {
        const result = mockSignUp(name, trimmedEmail, password)
        if (!result.ok) { setError(result.error); return }
        router.push('/home')
        return
      }

      const supabase = createClient()
      const { error: sbError } = await supabase.auth.signUp({
        email: trimmedEmail,
        password,
        options: { data: { name: name.trim() } },
      })

      if (sbError) {
        setError(mapError((sbError as { code?: string }).code, sbError.message))
        return
      }

      // Supabase sends a 6-digit OTP to the email (when Email OTP is enabled in
      // the Supabase dashboard).  Redirect the user to the verify-otp page so
      // they can enter that code and get a real session.
      router.push(`/auth/verify-otp?email=${encodeURIComponent(trimmedEmail)}`)
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
          {submitting ? 'Creating account…' : "I'm Ready"}
        </button>
      </form>
    </main>
  )
}