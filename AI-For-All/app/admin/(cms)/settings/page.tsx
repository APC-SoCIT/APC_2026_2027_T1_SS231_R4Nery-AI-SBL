'use client'

import { useState, useEffect } from 'react'
import { User, Lock, Eye, EyeOff, CheckCircle, AlertTriangle, Loader2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { getMockSession, updateMockSession } from '@/lib/mock-auth'

export default function AdminSettingsPage() {
  const supabase = createClient()

  /* ── Username state ─────────────────────────────────────── */
  const [username, setUsername] = useState('')
  const [originalUsername, setOriginalUsername] = useState('')
  const [userLoading, setUserLoading] = useState(false)

  /* ── Password state ─────────────────────────────────────── */
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showNew, setShowNew] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [passLoading, setPassLoading] = useState(false)

  /* ── Feedback ───────────────────────────────────────────── */
  const [toast, setToast] = useState<{ type: 'success' | 'error'; msg: string } | null>(null)

  // Auto-dismiss toast
  useEffect(() => {
    if (!toast) return
    const t = setTimeout(() => setToast(null), 4000)
    return () => clearTimeout(t)
  }, [toast])

  // Load current username on mount
  useEffect(() => {
    ; (async () => {
      const mockSession = getMockSession()
      if (mockSession) {
        setUsername(mockSession.name)
        setOriginalUsername(mockSession.name)
        return
      }

      const { data: { user } } = await supabase.auth.getUser()
      const name = user?.user_metadata?.display_name ?? user?.email ?? ''
      setUsername(name)
      setOriginalUsername(name)
    })()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  /* ── Handlers ───────────────────────────────────────────── */
  const handleUsernameSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!username.trim()) {
      setToast({ type: 'error', msg: 'Username cannot be empty.' })
      return
    }
    if (username === originalUsername) {
      setToast({ type: 'error', msg: 'Username is unchanged.' })
      return
    }
    setUserLoading(true)
    const mockSession = getMockSession()
    if (mockSession) {
      updateMockSession({ name: username.trim() })
      setOriginalUsername(username.trim())
      setToast({ type: 'success', msg: 'Username updated successfully!' })
      setUserLoading(false)
      return
    }

    const { error } = await supabase.auth.updateUser({
      data: { display_name: username.trim() },
    })
    setUserLoading(false)
    if (error) {
      setToast({ type: 'error', msg: error.message })
    } else {
      setOriginalUsername(username.trim())
      setToast({ type: 'success', msg: 'Username updated successfully!' })
    }
  }

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (newPassword.length < 6) {
      setToast({ type: 'error', msg: 'Password must be at least 6 characters.' })
      return
    }
    if (newPassword !== confirmPassword) {
      setToast({ type: 'error', msg: 'Passwords do not match.' })
      return
    }
    setPassLoading(true)
    const mockSession = getMockSession()
    if (mockSession) {
      setTimeout(() => {
        setNewPassword('')
        setConfirmPassword('')
        setToast({ type: 'success', msg: 'Password changed successfully!' })
        setPassLoading(false)
      }, 500)
      return
    }

    const { error } = await supabase.auth.updateUser({ password: newPassword })
    setPassLoading(false)
    if (error) {
      setToast({ type: 'error', msg: error.message })
    } else {
      setNewPassword('')
      setConfirmPassword('')
      setToast({ type: 'success', msg: 'Password changed successfully!' })
    }
  }

  const passwordMismatch = confirmPassword.length > 0 && newPassword !== confirmPassword

  return (
    <div className="settings-root">

      {/* Toast */}
      {toast && (
        <div className={`settings-toast settings-toast--${toast.type}`}>
          {toast.type === 'success' ? <CheckCircle size={16} /> : <AlertTriangle size={16} />}
          {toast.msg}
        </div>
      )}

      {/* ── Change Username ─────────────────────────────────── */}
      <form className="settings-card" onSubmit={handleUsernameSubmit}>
        <div className="settings-card-icon" style={{ background: 'var(--lavender-deep)', color: 'var(--ink)' }}>
          <User size={22} />
        </div>
        <h2>Change Username</h2>
        <p className="settings-card-desc">
          Update the display name shown across the admin panel.
        </p>

        <label className="settings-label">
          Username
          <input
            className="settings-input"
            type="text"
            placeholder="Enter new username"
            value={username}
            onChange={e => setUsername(e.target.value)}
          />
        </label>

        <button
          type="submit"
          className="settings-save"
          disabled={userLoading || username === originalUsername}
        >
          {userLoading ? <><Loader2 size={15} className="dash-spin" /> Saving…</> : 'Save Username'}
        </button>
      </form>

      {/* ── Change Password ─────────────────────────────────── */}
      <form className="settings-card" onSubmit={handlePasswordSubmit}>
        <div className="settings-card-icon" style={{ background: '#ffeeed', color: 'var(--coral)' }}>
          <Lock size={22} />
        </div>
        <h2>Change Password</h2>
        <p className="settings-card-desc">
          Choose a strong password with at least 6 characters.
        </p>

        <label className="settings-label">
          New Password
          <div className="settings-input-wrap">
            <input
              className="settings-input"
              type={showNew ? 'text' : 'password'}
              placeholder="Enter new password"
              value={newPassword}
              onChange={e => setNewPassword(e.target.value)}
            />
            <button
              type="button"
              className="settings-eye"
              onClick={() => setShowNew(v => !v)}
              tabIndex={-1}
            >
              {showNew ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
        </label>

        <label className="settings-label">
          Confirm Password
          <div className="settings-input-wrap">
            <input
              className={`settings-input${passwordMismatch ? ' settings-input--error' : ''}`}
              type={showConfirm ? 'text' : 'password'}
              placeholder="Repeat new password"
              value={confirmPassword}
              onChange={e => setConfirmPassword(e.target.value)}
            />
            <button
              type="button"
              className="settings-eye"
              onClick={() => setShowConfirm(v => !v)}
              tabIndex={-1}
            >
              {showConfirm ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
          {passwordMismatch && (
            <span className="settings-hint-error">Passwords do not match</span>
          )}
        </label>

        <button
          type="submit"
          className="settings-save settings-save--coral"
          disabled={passLoading || !newPassword || !confirmPassword}
        >
          {passLoading ? <><Loader2 size={15} className="dash-spin" /> Updating…</> : 'Update Password'}
        </button>
      </form>
    </div>
  )
}
