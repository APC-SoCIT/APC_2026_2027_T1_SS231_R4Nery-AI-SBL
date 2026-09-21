'use client'

/**
 * app/auth/check-email/page.tsx
 *
 * Shown after a successful sign-up call.
 * Tells the user to check their inbox and click the confirmation link.
 * When they do, Supabase redirects to /auth/callback which exchanges the
 * token for a session and sends them to /home automatically.
 */
import { Suspense, useEffect, useState } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { ChevronLeft, Mail, RefreshCw } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

const RESEND_COOLDOWN = 60 // seconds

function CheckEmailInner() {
  const params = useSearchParams()
  const email = params.get('email') ?? ''

  const [cooldown, setCooldown] = useState(0)
  const [resending, setResending] = useState(false)
  const [resendStatus, setResendStatus] = useState<'idle' | 'sent' | 'error'>('idle')
  const [resendError, setResendError] = useState('')

  // Count down the resend cooldown
  useEffect(() => {
    if (cooldown <= 0) return
    const id = setInterval(() => setCooldown((c) => c - 1), 1000)
    return () => clearInterval(id)
  }, [cooldown])

  async function handleResend() {
    if (cooldown > 0 || resending || !email) return
    setResending(true)
    setResendStatus('idle')
    setResendError('')
    try {
      const supabase = createClient()
      const { error } = await supabase.auth.resend({
        type: 'signup',
        email,
        // Same fix as the initial signUp() call — without this the resent
        // link falls back to the dashboard's "Site URL" (localhost).
        options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
      })
      if (error) {
        setResendStatus('error')
        setResendError(error.message)
        return
      }
      setResendStatus('sent')
      setCooldown(RESEND_COOLDOWN)
    } finally {
      setResending(false)
    }
  }

  const displayEmail = email || 'your email address'

  return (
    <main className="authpage authpage-signup">
      {/* Photo / mascot header */}
      <div className="authpage-photo authpage-photo-signup">
        <Link href="/sign-up" className="authpage-back" aria-label="Go back to sign up">
          <ChevronLeft size={20} />
        </Link>
        <img
          className="authpage-mascot-img signup-mascot"
          src="/ai-for-all/Mascot-look-down.png"
          alt="AI for ALL mascot"
        />
      </div>

      {/* Body */}
      <div className="authpage-body check-email-body">
        <h2>
          Check your
          <br />
          inbox!
        </h2>

        {/* Email icon badge */}
        <div className="check-email-icon-wrap" aria-hidden="true">
          <div className="check-email-icon">
            <Mail size={32} />
          </div>
        </div>

        <p className="check-email-desc">
          We sent a confirmation link to{' '}
          <strong className="check-email-addr">{displayEmail}</strong>.
          <br />
          Click <strong>"Confirm my email"</strong> inside it and you'll be logged
          in automatically.
        </p>

        <p className="check-email-hint">
          Can't find it? Check your spam folder.
        </p>

        {/* Resend feedback */}
        {resendStatus === 'sent' && (
          <p className="check-email-sent" role="status">
            ✓ A new confirmation email has been sent.
          </p>
        )}
        {resendStatus === 'error' && (
          <p className="authpage-error" role="alert">{resendError}</p>
        )}

        {/* Resend button */}
        <button
          id="resend-email-btn"
          className="check-email-resend"
          onClick={handleResend}
          disabled={cooldown > 0 || resending}
          aria-busy={resending}
        >
          <RefreshCw size={14} className={resending ? 'spin' : ''} />
          {resending
            ? 'Sending…'
            : cooldown > 0
            ? `Resend in ${cooldown}s`
            : 'Resend confirmation email'}
        </button>

        {/* Wrong email? */}
        <p className="check-email-wrong">
          Wrong email?{' '}
          <Link href="/sign-up" className="check-email-link">
            Go back and try again
          </Link>
        </p>
      </div>
    </main>
  )
}

// useSearchParams requires a Suspense boundary in Next.js App Router
export default function CheckEmailPage() {
  return (
    <Suspense
      fallback={
        <main className="authpage authpage-signup">
          <div className="authpage-photo authpage-photo-signup" />
          <div className="authpage-body" />
        </main>
      }
    >
      <CheckEmailInner />
    </Suspense>
  )
}