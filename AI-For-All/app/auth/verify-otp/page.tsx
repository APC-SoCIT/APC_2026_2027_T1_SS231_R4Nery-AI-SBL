'use client'

/**
 * app/auth/verify-otp/page.tsx  — Phase 2: SMS OTP Verification
 *
 * Used for two flows (distinguished by ?mode query param):
 *
 *   [default] Registration confirmation
 *     - supabase.auth.verifyOtp({ phone, token, type: 'sms' })
 *     - On success → /home
 *
 *   [mode=reset] Password reset
 *     - Same OTP verify → session established
 *     - Then shows "Set new password" form → supabase.auth.updateUser({ password })
 *     - On success → /home
 *
 * Query params expected:
 *   ?phone=+639171234567          (E.164, set by /sign-up or /sign-in forgot-password)
 *   ?mode=reset                   (optional, triggers reset flow)
 *
 * Note: useSearchParams() requires a Suspense boundary — the page is split
 * into VerifyOtpInner (reads params) and the exported default (Suspense wrapper).
 */
import { Suspense, useEffect, useRef, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { ChevronLeft } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { formatDisplay } from '@/lib/phoneUtils'

const RESEND_COOLDOWN = 60 // seconds

// Error code → user-friendly message (design doc §12)
const OTP_ERRORS: Record<string, string> = {
  otp_expired: 'That code has expired. Tap Resend to get a new one.',
  invalid_otp: 'Incorrect code. Please try again.',
  otp_disabled: 'Incorrect code. Please try again.',
  over_request_rate_limit: 'Too many attempts. Please wait a moment before trying again.',
}

function mapError(code: string | undefined, message: string): string {
  if (code && OTP_ERRORS[code]) return OTP_ERRORS[code]
  return message
}

function VerifyOtpInner() {
  const router = useRouter()
  const params = useSearchParams()
  const phone = params.get('phone') ?? ''
  const isReset = params.get('mode') === 'reset'

  const [digits, setDigits] = useState(['', '', '', '', '', ''])
  const inputRefs = useRef<(HTMLInputElement | null)[]>([])
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  // Post-OTP password reset state
  const [otpVerified, setOtpVerified] = useState(false)
  const [newPassword, setNewPassword] = useState('')
  const [newPassword2, setNewPassword2] = useState('')
  const [resetError, setResetError] = useState('')
  const [resetSubmitting, setResetSubmitting] = useState(false)

  // Resend cooldown
  const [cooldown, setCooldown] = useState(0)
  const [resending, setResending] = useState(false)

  useEffect(() => {
    if (cooldown <= 0) return
    const id = setInterval(() => setCooldown((c) => c - 1), 1000)
    return () => clearInterval(id)
  }, [cooldown])

  // ── Digit input handlers ──────────────────────────────────────────────────

  function handleDigit(index: number, value: string) {
    const digit = value.replace(/\D/g, '').slice(-1)
    const next = [...digits]
    next[index] = digit
    setDigits(next)
    if (digit && index < 5) {
      inputRefs.current[index + 1]?.focus()
    }
    // Auto-submit when all 6 filled
    if (digit && next.every(Boolean)) {
      submitOtp(next.join(''))
    }
  }

  function handleKeyDown(index: number, e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Backspace' && !digits[index] && index > 0) {
      inputRefs.current[index - 1]?.focus()
    }
  }

  function handlePaste(e: React.ClipboardEvent<HTMLInputElement>) {
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6)
    if (!pasted) return
    e.preventDefault()
    const next = [...digits]
    pasted.split('').forEach((d, i) => { if (i < 6) next[i] = d })
    setDigits(next)
    if (pasted.length === 6) submitOtp(pasted)
    else inputRefs.current[pasted.length]?.focus()
  }

  // ── OTP submit ────────────────────────────────────────────────────────────

  async function submitOtp(token: string) {
    if (!phone) { setError('Missing phone number. Please go back and try again.'); return }
    setError('')
    setSubmitting(true)
    try {
      const supabase = createClient()
      const { error: sbError } = await supabase.auth.verifyOtp({
        phone,
        token,
        type: 'sms',
      })
      if (sbError) {
        setError(mapError((sbError as { code?: string }).code, sbError.message))
        // Clear digits so user can retry
        setDigits(['', '', '', '', '', ''])
        setTimeout(() => inputRefs.current[0]?.focus(), 50)
        return
      }
      if (isReset) {
        setOtpVerified(true)
      } else {
        router.push('/home')
      }
    } finally {
      setSubmitting(false)
    }
  }

  function handleManualSubmit(e: React.FormEvent) {
    e.preventDefault()
    submitOtp(digits.join(''))
  }

  // ── Resend ────────────────────────────────────────────────────────────────

  async function handleResend() {
    if (!phone || cooldown > 0) return
    setResending(true)
    try {
      const supabase = createClient()
      const { error: sbError } = await supabase.auth.resend({
        type: 'sms',
        phone,
      })
      if (sbError) {
        setError(mapError((sbError as { code?: string }).code, sbError.message))
        return
      }
      setCooldown(RESEND_COOLDOWN)
      setDigits(['', '', '', '', '', ''])
      inputRefs.current[0]?.focus()
    } finally {
      setResending(false)
    }
  }

  // ── Password reset (post-OTP) ─────────────────────────────────────────────

  async function handleSetPassword(e: React.FormEvent) {
    e.preventDefault()
    setResetError('')
    if (newPassword.length < 8) { setResetError('Password must be at least 8 characters.'); return }
    if (newPassword !== newPassword2) { setResetError('Passwords do not match.'); return }
    setResetSubmitting(true)
    try {
      const supabase = createClient()
      const { error: sbError } = await supabase.auth.updateUser({ password: newPassword })
      if (sbError) {
        setResetError(sbError.message)
        return
      }
      router.push('/home')
    } finally {
      setResetSubmitting(false)
    }
  }

  // ── Render: "Set new password" screen (reset mode, post-OTP) ─────────────

  if (otpVerified) {
    return (
      <main className="authpage authpage-signup">
        <div className="authpage-photo authpage-photo-signup">
          <Link href="/sign-in" className="authpage-back" aria-label="Go back">
            <ChevronLeft size={20} />
          </Link>
          <img
            className="authpage-mascot-img signup-mascot"
            src="/ai-for-all/Mascot-look-down.png"
            alt="AI for ALL mascot"
          />
        </div>
        <form className="authpage-body" onSubmit={handleSetPassword} noValidate>
          <h2>
            Set your
            <br />
            new password
          </h2>
          <p className="otp-subtitle">Enter a new password for your account.</p>

          <label className="sr-only" htmlFor="new-password">New password</label>
          <input
            id="new-password"
            className="authpage-field"
            type="password"
            placeholder="New password (8+ characters)"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            autoComplete="new-password"
          />
          <label className="sr-only" htmlFor="new-password-2">Confirm new password</label>
          <input
            id="new-password-2"
            className="authpage-field"
            type="password"
            placeholder="Confirm new password"
            value={newPassword2}
            onChange={(e) => setNewPassword2(e.target.value)}
            autoComplete="new-password"
          />

          {resetError && (
            <p className="authpage-error" role="alert">{resetError}</p>
          )}

          <button
            type="submit"
            className={`authpage-submit${newPassword.length >= 8 && newPassword === newPassword2 ? ' is-ready' : ''}`}
            disabled={resetSubmitting}
            aria-busy={resetSubmitting}
          >
            {resetSubmitting ? 'Saving…' : 'Save new password'}
          </button>
        </form>
      </main>
    )
  }

  // ── Render: OTP entry screen ──────────────────────────────────────────────

  const displayPhone = phone ? formatDisplay(phone) : 'your mobile number'

  return (
    <main className="authpage authpage-signup">
      <div className="authpage-photo authpage-photo-signup">
        <Link href={isReset ? '/sign-in' : '/sign-up'} className="authpage-back" aria-label="Go back">
          <ChevronLeft size={20} />
        </Link>
        <img
          className="authpage-mascot-img signup-mascot"
          src="/ai-for-all/Mascot-look-down.png"
          alt="AI for ALL mascot"
        />
      </div>

      <form className="authpage-body otp-body" onSubmit={handleManualSubmit} noValidate>
        <h2>
          {isReset ? 'Reset your\npassword' : 'Verify your\nnumber'}
        </h2>
        <p className="otp-subtitle">
          We sent a 6-digit code to{' '}
          <strong>{displayPhone}</strong>.
          {' '}Enter it below.
        </p>

        <div className="otp-inputs" aria-label="Enter the 6-digit verification code">
          {digits.map((d, i) => (
            <input
              key={i}
              ref={(el) => { inputRefs.current[i] = el }}
              className="otp-digit"
              type="text"
              inputMode="numeric"
              maxLength={1}
              value={d}
              aria-label={`Digit ${i + 1}`}
              onChange={(e) => handleDigit(i, e.target.value)}
              onKeyDown={(e) => handleKeyDown(i, e)}
              onPaste={i === 0 ? handlePaste : undefined}
              disabled={submitting}
            />
          ))}
        </div>

        {error && (
          <p className="authpage-error" role="alert">{error}</p>
        )}

        <div className="otp-resend">
          {cooldown > 0 ? (
            <span className="otp-resend-cooldown">
              Resend code in {cooldown}s
            </span>
          ) : (
            <button
              type="button"
              className="otp-resend-btn"
              onClick={handleResend}
              disabled={resending}
            >
              {resending ? 'Sending…' : 'Resend code'}
            </button>
          )}
        </div>

        <button
          type="submit"
          className={`authpage-submit${digits.every(Boolean) ? ' is-ready' : ''}`}
          disabled={!digits.every(Boolean) || submitting}
          aria-busy={submitting}
        >
          {submitting ? 'Verifying…' : 'Verify'}
        </button>
      </form>
    </main>
  )
}

// useSearchParams() requires a Suspense boundary in Next.js App Router.
export default function VerifyOtpPage() {
  return (
    <Suspense
      fallback={
        <main className="authpage authpage-signup">
          <div className="authpage-photo authpage-photo-signup" />
          <div className="authpage-body" />
        </main>
      }
    >
      <VerifyOtpInner />
    </Suspense>
  )
}
