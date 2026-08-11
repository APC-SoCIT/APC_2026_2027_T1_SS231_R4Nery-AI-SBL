'use client'

import { useState, type FormEvent } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { AuthMascotHeader } from '@/components/auth/auth-mascot-header'
import { FacebookIcon, GoogleIcon } from '@/components/auth/social-icons'
import { mockSignUp } from '@/lib/mock-auth'

export default function SignUpPage() {
  const router = useRouter()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')

  const ready = name.trim().length > 0 && email.trim().length > 0 && password.length > 0

  function handleSubmit(e: FormEvent) {
    e.preventDefault()
    const result = mockSignUp(name, email, password)
    if (!result.ok) {
      setError(result.error)
      return
    }
    setError('')
    // New registered users go straight to Home — never back to Landing/guest flow.
    router.push('/home')
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
          Email
        </label>
        <input
          id="signup-email"
          className="authpage-field"
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          autoComplete="email"
        />

        <label className="sr-only" htmlFor="signup-password">
          Password
        </label>
        <input
          id="signup-password"
          className="authpage-field"
          type="password"
          placeholder="Password"
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
          <button type="button" className="authpage-social authpage-social-fb">
            <FacebookIcon /> facebook
          </button>
          <button type="button" className="authpage-social authpage-social-google">
            <GoogleIcon /> Google
          </button>
        </div>

        <p className="authpage-links">
          <Link href="/sign-in">
            Already have an account? <strong>Sign in</strong>
          </Link>
        </p>

        <button type="submit" className={`authpage-submit${ready ? ' is-ready' : ''}`} disabled={!ready}>
          I&apos;m Ready
        </button>
      </form>
    </main>
  )
}