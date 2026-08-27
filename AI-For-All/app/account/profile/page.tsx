'use client'

/**
 * app/account/profile/page.tsx
 *
 * SBL P1.7 — Update Account Details
 * SBL P1.8 — Update Confirmation (toast)
 *
 * - Reads the authenticated user's profile via GET /api/account/profile.
 * - Lets the user edit their name and submit via PATCH /api/account/profile.
 * - Shows a success toast (react-hot-toast) on save.
 * - Offers a "Sign out" button (scope: global — all devices).
 * - Protected by proxy.ts — unauthenticated users are redirected to /sign-in.
 */
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ArrowLeft, User, Mail, Shield, ChevronRight, LogOut, Trash2 } from 'lucide-react'
import toast from 'react-hot-toast'
import { createClient } from '@/lib/supabase/client'

interface Profile {
  id: string
  name: string | null
  email: string | null
  role: string
  authMethod: string
}

export default function AccountProfilePage() {
  const router = useRouter()
  const [profile, setProfile] = useState<Profile | null>(null)
  const [name, setName] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)

  // ── Load profile ──────────────────────────────────────────────────────────
  useEffect(() => {
    async function load() {
      try {
        const res = await fetch('/api/account/profile')
        if (res.status === 401) {
          router.push('/sign-in?next=/account/profile')
          return
        }
        const data = await res.json()
        if (data.error) throw new Error(data.error)
        setProfile(data)
        setName(data.name ?? '')
      } catch (err: any) {
        toast.error(err.message ?? 'Failed to load profile.')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [router])

  // ── Save name ─────────────────────────────────────────────────────────────
  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim()) { toast.error('Name cannot be empty.'); return }
    setSaving(true)
    try {
      const res = await fetch('/api/account/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim() }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Failed to save.')
      setProfile(prev => prev ? { ...prev, name: data.name } : prev)
      toast.success('Profile updated!')
    } catch (err: any) {
      toast.error(err.message ?? 'Something went wrong.')
    } finally {
      setSaving(false)
    }
  }

  // ── Sign out ──────────────────────────────────────────────────────────────
  async function handleSignOut() {
    const supabase = createClient()
    await supabase.auth.signOut({ scope: 'global' })
    router.push('/get-started')
  }

  // ── Delete account ────────────────────────────────────────────────────────
  async function handleDelete() {
    if (!confirmDelete) { setConfirmDelete(true); return }
    setDeleting(true)
    try {
      const res = await fetch('/api/account', { method: 'DELETE' })
      if (!res.ok) {
        const d = await res.json()
        throw new Error(d.error ?? 'Deletion failed.')
      }
      toast.success('Account deleted. Goodbye!')
      router.push('/get-started')
    } catch (err: any) {
      toast.error(err.message)
      setDeleting(false)
      setConfirmDelete(false)
    }
  }

  // ── Render states ─────────────────────────────────────────────────────────
  const initials = profile?.name
    ? profile.name.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase()
    : (profile?.email ?? 'U')[0].toUpperCase()

  if (loading) {
    return (
      <div className="simple-page">
        <p style={{ color: 'var(--muted)', textAlign: 'center', paddingTop: 60 }}>Loading…</p>
      </div>
    )
  }

  return (
    <main className="simple-page">
      {/* Back */}
      <Link href="/home" className="acct-back">
        <ArrowLeft size={18} />
      </Link>

      {/* Header */}
      <div className="simple-page-heading" style={{ marginTop: 8 }}>
        <p className="kicker">YOUR ACCOUNT</p>
        <h2 style={{ fontSize: 'clamp(22px,6vw,26px)', marginBottom: 4 }}>Profile</h2>
        <p style={{ color: 'var(--muted)', fontSize: 13 }}>Manage your name and account details</p>
      </div>

      {/* Avatar card */}
      <div className="profile-card" style={{ marginBottom: 24 }}>
        <div className="profile-avatar" style={{ fontSize: 18, fontWeight: 800 }}>
          {initials}
        </div>
        <div>
          <strong>{profile?.name ?? 'No name set'}</strong>
          <small>{profile?.email ?? '—'}</small>
        </div>
      </div>

      {/* Edit form */}
      <form onSubmit={handleSave} className="acct-form">
        <label className="acct-label">
          <span className="acct-label-text">
            <User size={13} style={{ verticalAlign: 'middle', marginRight: 4 }} />
            Full name
          </span>
          <input
            className="acct-input"
            type="text"
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder="Your full name"
            maxLength={255}
            required
          />
        </label>

        <label className="acct-label">
          <span className="acct-label-text">
            <Mail size={13} style={{ verticalAlign: 'middle', marginRight: 4 }} />
            Email address
          </span>
          <input
            className="acct-input"
            type="email"
            value={profile?.email ?? ''}
            disabled
            title="Email cannot be changed here"
          />
          <span style={{ fontSize: 11, color: 'var(--muted)', marginTop: 4 }}>
            To change your email, contact support.
          </span>
        </label>

        <button
          type="submit"
          className={`authpage-submit${name.trim() && name.trim() !== (profile?.name ?? '') ? ' is-ready' : ''}`}
          disabled={saving || !name.trim() || name.trim() === (profile?.name ?? '')}
          style={{ marginTop: 8 }}
        >
          {saving ? 'Saving…' : 'Save changes'}
        </button>
      </form>

      {/* Security shortcut */}
      <Link href="/account/security" className="acct-nav-row" style={{ marginTop: 24 }}>
        <span className="acct-nav-icon" style={{ background: 'var(--apc-pale)' }}>
          <Shield size={16} color="var(--apc-navy-deep)" />
        </span>
        <span className="acct-nav-label">
          <strong>Security</strong>
          <small>Change password or link Google</small>
        </span>
        <ChevronRight size={16} color="var(--muted)" />
      </Link>

      {/* Sign out */}
      <div style={{ marginTop: 32, display: 'grid', gap: 10 }}>
        <button className="profile-signout" onClick={handleSignOut}>
          <LogOut size={16} />
          Sign out of all devices
        </button>

        {/* Danger zone — delete account */}
        {confirmDelete ? (
          <div style={{ background: '#fff0ee', borderRadius: 14, padding: '14px 16px' }}>
            <p style={{ margin: '0 0 10px', fontSize: 13, color: '#c0392b', fontWeight: 700 }}>
              This will permanently delete your account and all progress. Are you sure?
            </p>
            <div style={{ display: 'flex', gap: 10 }}>
              <button
                onClick={handleDelete}
                disabled={deleting}
                style={{ flex: 1, minHeight: 42, borderRadius: 12, background: '#c0392b', color: '#fff', fontWeight: 700, fontSize: 13 }}
              >
                {deleting ? 'Deleting…' : 'Yes, delete my account'}
              </button>
              <button
                onClick={() => setConfirmDelete(false)}
                style={{ flex: 1, minHeight: 42, borderRadius: 12, border: '1px solid var(--line)', background: '#fff', color: 'var(--ink)', fontWeight: 700, fontSize: 13 }}
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <button
            onClick={() => setConfirmDelete(true)}
            style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '12px 16px', borderRadius: 14, background: 'transparent', border: '1px solid #f0b3af', color: '#c0392b', fontWeight: 700, fontSize: 13 }}
          >
            <Trash2 size={15} />
            Delete account
          </button>
        )}
      </div>
    </main>
  )
}
