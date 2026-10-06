'use client'

/**
 * app/account/security/page.tsx
 *
 * Security settings for an authenticated user:
 *  - Change password (available when the user has an email identity)
 *  - Link Google account (adds Google as a second identity for easier login)
 *
 * Protected by proxy.ts — unauthenticated users are redirected to /sign-in.
 */
import { useState, useEffect } from 'react'
import Link from 'next/link'
import { ArrowLeft, Lock, Globe2 } from 'lucide-react'
import toast from 'react-hot-toast'
import { createClient } from '@/lib/supabase/client'

// Password rules — must match sign-up: 8+ chars, letters & numbers only
const PASSWORD_PATTERN = /^[A-Za-z0-9]+$/

export default function AccountSecurityPage() {
  const supabase = createClient()

  const [currentPassword, setCurrentPassword] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [savingPw, setSavingPw] = useState(false)
  const [linkingGoogle, setLinkingGoogle] = useState(false)
  const [identities, setIdentities] = useState<string[]>([])

  // Load the current user's linked identities
  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user?.identities) {
        setIdentities(user.identities.map(i => i.provider))
      }
    })
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Change password ────────────────────────────────────────────────────────
  async function handleChangePassword(e: React.FormEvent) {
    e.preventDefault()
    if (!currentPassword) { toast.error('Please enter your current password.'); return }
    if (password.length < 8) { toast.error('Password must be at least 8 characters.'); return }
    if (!PASSWORD_PATTERN.test(password)) {
      toast.error('Password can only contain letters and numbers — no symbols or spaces.')
      return
    }
    if (password === currentPassword) { toast.error('New password cannot be the same as your current password.'); return }
    if (password !== confirm) { toast.error('Passwords do not match.'); return }

    setSavingPw(true)

    // Verify current password before updating
    const { data: { user } } = await supabase.auth.getUser()
    if (user?.email) {
      const { error: signInErr } = await supabase.auth.signInWithPassword({
        email: user.email,
        password: currentPassword,
      })
      if (signInErr) {
        toast.error('Current password is incorrect.')
        setSavingPw(false)
        return
      }
    }

    const { error } = await supabase.auth.updateUser({ password })
    setSavingPw(false)

    if (error) {
      toast.error(error.message)
    } else {
      toast.success('Password updated!')
      setCurrentPassword('')
      setPassword('')
      setConfirm('')
    }
  }

  // ── Link Google ────────────────────────────────────────────────────────────
  async function handleLinkGoogle() {
    setLinkingGoogle(true)
    const { error } = await supabase.auth.linkIdentity({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback?next=/account/security`,
      },
    })
    if (error) {
      toast.error(error.message)
      setLinkingGoogle(false)
    }
    // On success the browser navigates away — no need to clear loading state.
  }

  const hasGoogle = identities.includes('google')
  const pwReady = !!currentPassword && password.length >= 8 && PASSWORD_PATTERN.test(password) && password !== currentPassword && password === confirm

  return (
    <main className="simple-page">
      {/* Back */}
      <Link href="/account/profile" className="acct-back">
        <ArrowLeft size={18} />
      </Link>

      {/* Header */}
      <div className="simple-page-heading" style={{ marginTop: 8 }}>
        <p className="kicker">YOUR ACCOUNT</p>
        <h2 style={{ fontSize: 'clamp(22px,6vw,26px)', marginBottom: 4 }}>Security</h2>
        <p style={{ color: 'var(--muted)', fontSize: 13 }}>
          Update your password or link additional sign-in methods.
        </p>
      </div>

      {/* ── Change Password ── */}
      <section className="acct-section">
        <div className="acct-section-heading">
          <Lock size={15} />
          <strong>Change password</strong>
        </div>

        <form onSubmit={handleChangePassword} className="acct-form" style={{ marginTop: 0 }}>
          <label className="acct-label">
            <span className="acct-label-text">Current password</span>
            <input
              className="acct-input"
              type="password"
              value={currentPassword}
              onChange={e => setCurrentPassword(e.target.value)}
              placeholder="Enter your current password"
              autoComplete="current-password"
            />
          </label>

          <label className="acct-label">
            <span className="acct-label-text">New password</span>
            <input
              className="acct-input"
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="8+ characters, letters and numbers only"
              minLength={8}
              autoComplete="new-password"
            />
            <span style={{ fontSize: 11, color: 'var(--muted)', marginTop: 4, display: 'block' }}>
              8+ characters, letters and numbers only (no symbols or spaces).
            </span>
          </label>

          <label className="acct-label">
            <span className="acct-label-text">Confirm new password</span>
            <input
              className="acct-input"
              type="password"
              value={confirm}
              onChange={e => setConfirm(e.target.value)}
              placeholder="Repeat new password"
              minLength={8}
              autoComplete="new-password"
            />
          </label>

          <button
            type="submit"
            className={`authpage-submit${pwReady ? ' is-ready' : ''}`}
            disabled={savingPw || !pwReady}
            style={{ marginTop: 4 }}
          >
            {savingPw ? 'Updating…' : 'Update password'}
          </button>
        </form>
      </section>

      {/* ── Link Google ── */}
      <section className="acct-section" style={{ marginTop: 24 }}>
        <div className="acct-section-heading">
          <Globe2 size={15} />
          <strong>Linked accounts</strong>
        </div>

        <p style={{ fontSize: 13, color: 'var(--muted)', margin: '8px 0 14px' }}>
          Link Google to sign in faster without a password.
        </p>

        {hasGoogle ? (
          <div
            style={{
              display: 'flex', alignItems: 'center', gap: 10,
              padding: '12px 16px', borderRadius: 14,
              background: '#eef8d5', color: '#648a1e', fontSize: 13, fontWeight: 700,
            }}
          >
            <Globe2 size={16} />
            Google is linked ✓
          </div>
        ) : (
          <button
            onClick={handleLinkGoogle}
            disabled={linkingGoogle}
            className="authpage-social authpage-social-google"
            style={{ width: '100%', minHeight: 48, borderRadius: 14, fontSize: 14 }}
          >
            <Globe2 size={16} />
            {linkingGoogle ? 'Redirecting…' : 'Link Google account'}
          </button>
        )}
      </section>
    </main>
  )
}
