'use client'

import { useState, type FormEvent } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { AuthMascotHeader } from '@/components/auth/auth-mascot-header'
import { FacebookIcon, GoogleIcon } from '@/components/auth/social-icons'
import { mockSignIn } from '@/lib/mock-auth'

export default function SignInPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')

  function handleSubmit(e: FormEvent) {
    e.preventDefault()
    const result = mockSignIn(email, password)
    if (!result.ok) {
      setError(result.error)
      return
    }
    setError('')
    // Route by role: admin test account -> Admin CMS, everyone else -> Home.
    router.push(result.user.role === 'admin' ? '/admin' : '/home')
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
          className="authpage-field"
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          autoComplete="email"
        />

        <label className="sr-only" htmlFor="signin-password">
          Password
        </label>
        <input
          id="signin-password"
          className="authpage-field"
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

        <p className="authpage-links">
          <button type="button" className="authpage-link-btn" disabled>
            I forgot my <u>email/password</u>
          </button>
        </p>
        <p className="authpage-links">
          Don&apos;t have an account?{' '}
          <Link href="/sign-up">
            <strong>Make one</strong>
          </Link>
        </p>

        <div className="authpage-socials">
          <button type="button" className="authpage-social authpage-social-fb">
            <FacebookIcon /> facebook
          </button>
          <button type="button" className="authpage-social authpage-social-google">
            <GoogleIcon /> Google
          </button>
        </div>

        <button type="submit" className="authpage-submit authpage-submit-gold">
          Login
        </button>
      </form>
    </main>
  )
}