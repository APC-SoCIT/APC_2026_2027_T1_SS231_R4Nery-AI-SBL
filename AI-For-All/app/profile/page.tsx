'use client'

/**
 * app/profile/page.tsx
 *
 * Profile Hub — three in-page views:
 *   1. Main view   — avatar, name, role, stats, menu (Profile Details / Settings / Log out)
 *   2. Details     — change avatar photo + display name
 *   3. Settings    — delete account (with confirm dialog)
 *
 * Matches the app's APC blue design system; uses the same bottom nav as Home.
 */
import { useEffect, useRef, useState, type ChangeEvent } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  ArrowLeft, Camera, Check, ChevronRight,
  LogOut, Settings, Trash2, UserRound,
} from 'lucide-react'
import toast from 'react-hot-toast'
import { createClient } from '@/lib/supabase/client'
import { RegisteredBottomNav } from '@/components/nav/registered-bottom-nav'

// ─── Types ────────────────────────────────────────────────────────────────────

interface ProfileData {
  id: string
  name: string | null
  email: string | null
  role: string
  avatarUrl: string | null
}

interface Progress {
  completedModules: string[]
  totalPoints: number
}

type View = 'main' | 'details' | 'settings'

// ─── Helpers ─────────────────────────────────────────────────────────────────

function getInitials(name: string | null, email: string | null): string {
  if (name) return name.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase()
  return (email ?? 'U')[0].toUpperCase()
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function ProfileHubPage() {
  const router = useRouter()

  const [view, setView] = useState<View>('main')
  const [profile, setProfile] = useState<ProfileData | null>(null)
  const [progress, setProgress] = useState<Progress | null>(null)
  const [loading, setLoading] = useState(true)

  // Profile Details state
  const [name, setName] = useState('')
  const [saving, setSaving] = useState(false)
  const [avatarUploading, setAvatarUploading] = useState(false)
  const [localAvatar, setLocalAvatar] = useState<string | null>(null)

  // Settings state
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [deleting, setDeleting] = useState(false)

  const fileInputRef = useRef<HTMLInputElement>(null)
  const detailsFileInputRef = useRef<HTMLInputElement>(null)

  // ── Load profile + progress ─────────────────────────────────────────────────
  useEffect(() => {
    async function load() {
      try {
        const [profileRes, progressRes, avatarRes] = await Promise.all([
          fetch('/api/account/profile'),
          fetch('/api/progress'),
          fetch('/api/account/avatar'),
        ])

        if (profileRes.status === 401) {
          router.push('/sign-in?next=/profile')
          return
        }

        const profileData = await profileRes.json()
        if (profileData.error) throw new Error(profileData.error)

        const avatarData = avatarRes.ok ? await avatarRes.json() : {}

        setProfile({
          id: profileData.id,
          name: profileData.name,
          email: profileData.email,
          role: profileData.role,
          avatarUrl: avatarData.avatarUrl ?? null,
        })
        setLocalAvatar(avatarData.avatarUrl ?? null)
        setName(profileData.name ?? '')

        if (progressRes.ok) {
          setProgress(await progressRes.json())
        }
      } catch (err: any) {
        toast.error(err.message ?? 'Failed to load profile.')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [router])

  // ── Upload avatar ────────────────────────────────────────────────────────────
  async function handleAvatarChange(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    // Optimistic preview
    const objectUrl = URL.createObjectURL(file)
    setLocalAvatar(objectUrl)
    setAvatarUploading(true)

    try {
      const fd = new FormData()
      fd.append('file', file)
      const res = await fetch('/api/account/avatar', { method: 'POST', body: fd })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Upload failed.')
      setLocalAvatar(data.avatarUrl)
      setProfile(prev => prev ? { ...prev, avatarUrl: data.avatarUrl } : prev)
      toast.success('Profile photo updated!')
    } catch (err: any) {
      setLocalAvatar(profile?.avatarUrl ?? null)   // revert
      toast.error(err.message ?? 'Upload failed.')
    } finally {
      setAvatarUploading(false)
      // Reset the file input so the same file can be re-selected
      if (fileInputRef.current) fileInputRef.current.value = ''
      if (detailsFileInputRef.current) detailsFileInputRef.current.value = ''
    }
  }

  // ── Save display name ────────────────────────────────────────────────────────
  async function handleSaveName(e: React.FormEvent) {
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
      toast.success('Display name updated!')
      setView('main')
    } catch (err: any) {
      toast.error(err.message ?? 'Something went wrong.')
    } finally {
      setSaving(false)
    }
  }

  // ── Log out ─────────────────────────────────────────────────────────────────
  async function handleLogOut() {
    const supabase = createClient()
    await supabase.auth.signOut({ scope: 'global' })
    router.push('/get-started')
  }

  // ── Delete account ───────────────────────────────────────────────────────────
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

  // ── Loading ─────────────────────────────────────────────────────────────────
  if (loading) {
    return <div className="prof-loading">Loading…</div>
  }

  // ── Derived values ─────────────────────────────────────────────────────────
  const initials = getInitials(profile?.name ?? null, profile?.email ?? null)
  const completedCount = progress?.completedModules?.length ?? 0
  const totalPoints = progress?.totalPoints ?? 0
  const goalCount = 1   // single "Understand AI Basics" goal

  const roleLabel = profile?.role
    ? profile.role.charAt(0).toUpperCase() + profile.role.slice(1)
    : 'Learner'

  const nameChanged = name.trim() !== (profile?.name ?? '') && name.trim().length > 0

  // ── Avatar render helper ────────────────────────────────────────────────────
  function AvatarImage({ size }: { size: 'large' | 'medium' }) {
    const cls = size === 'large' ? 'prof-avatar' : 'prof-details-avatar'
    return (
      <div className={cls} aria-label="Profile avatar">
        {localAvatar
          ? <img src={localAvatar} alt={profile?.name ?? 'Avatar'} />
          : <span>{initials}</span>
        }
      </div>
    )
  }

  // ══════════════════════════════════════════════════════════════════════════════
  // ── RENDER: Details sub-screen ───────────────────────────────────────────────
  // ══════════════════════════════════════════════════════════════════════════════
  if (view === 'details') {
    return (
      <div className="prof-page">
        <div className="prof-sub" role="region" aria-label="Profile Details">
          {/* Blue hero */}
          <div className="prof-sub-hero">
            <div className="prof-sub-hero-bar">
              <button
                id="details-back-btn"
                className="prof-sub-back"
                onClick={() => setView('main')}
                aria-label="Back to profile"
              >
                <ArrowLeft size={18} />
              </button>
              <span className="prof-sub-title">Profile Details</span>
            </div>
          </div>

          {/* Body */}
          <div className="prof-sub-body">
            {/* Avatar edit */}
            <div className="prof-details-avatar-wrap">
              <AvatarImage size="medium" />
              <label
                id="details-change-photo-btn"
                className={`prof-details-avatar-btn${avatarUploading ? ' prof-uploading' : ''}`}
                aria-label="Change profile photo"
              >
                <Camera size={14} />
                {avatarUploading ? 'Uploading…' : 'Change Photo'}
                <input
                  ref={detailsFileInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/gif"
                  onChange={handleAvatarChange}
                  aria-hidden="true"
                />
              </label>
            </div>

            {/* Name form */}
            <form onSubmit={handleSaveName} className="prof-sub-form">
              <label className="prof-sub-label">
                <span className="prof-sub-label-text">
                  <UserRound size={12} style={{ verticalAlign: 'middle', marginRight: 4 }} />
                  Display Name
                </span>
                <input
                  id="details-name-input"
                  className="prof-sub-input"
                  type="text"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  placeholder="Your display name"
                  maxLength={100}
                  required
                />
              </label>

              <label className="prof-sub-label">
                <span className="prof-sub-label-text">Email address</span>
                <input
                  className="prof-sub-input"
                  type="email"
                  value={profile?.email ?? ''}
                  disabled
                  aria-readonly="true"
                  title="Email cannot be changed here"
                />
              </label>

              <button
                id="details-save-btn"
                type="submit"
                className={`prof-sub-save${nameChanged ? ' is-ready' : ''}`}
                disabled={saving || !nameChanged}
                style={{ marginTop: 4 }}
              >
                {saving ? 'Saving…' : 'Save Changes'}
              </button>
            </form>
          </div>
        </div>

        <RegisteredBottomNav active="profile" />
      </div>
    )
  }

  // ══════════════════════════════════════════════════════════════════════════════
  // ── RENDER: Settings sub-screen ──────────────────────────────────────────────
  // ══════════════════════════════════════════════════════════════════════════════
  if (view === 'settings') {
    return (
      <div className="prof-page">
        <div className="prof-sub" role="region" aria-label="Settings">
          {/* Blue hero */}
          <div className="prof-sub-hero">
            <div className="prof-sub-hero-bar">
              <button
                id="settings-back-btn"
                className="prof-sub-back"
                onClick={() => { setConfirmDelete(false); setView('main') }}
                aria-label="Back to profile"
              >
                <ArrowLeft size={18} />
              </button>
              <span className="prof-sub-title">Settings</span>
            </div>
          </div>

          {/* Body */}
          <div className="prof-sub-body">
            {/* Danger zone */}
            <div className="prof-settings-section">
              <p className="prof-settings-heading">Danger Zone</p>

              {confirmDelete ? (
                <div className="prof-confirm-box">
                  <p className="prof-confirm-text">
                    This will permanently delete your account and all progress. This cannot be undone.
                  </p>
                  <div className="prof-confirm-actions">
                    <button
                      id="settings-confirm-delete-btn"
                      className="prof-confirm-yes"
                      onClick={handleDelete}
                      disabled={deleting}
                    >
                      {deleting ? 'Deleting…' : 'Yes, delete'}
                    </button>
                    <button
                      id="settings-cancel-delete-btn"
                      className="prof-confirm-cancel"
                      onClick={() => setConfirmDelete(false)}
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  id="settings-delete-btn"
                  className="prof-delete-btn"
                  onClick={() => setConfirmDelete(true)}
                >
                  <Trash2 size={16} />
                  Delete Account
                </button>
              )}
            </div>

            {/* Back shortcut */}
            <button
              id="settings-back-to-profile-btn"
              className="prof-menu-row"
              style={{ borderRadius: 18, border: '1px solid var(--line)', marginTop: 4 }}
              onClick={() => { setConfirmDelete(false); setView('main') }}
            >
              <span className="prof-menu-icon">
                <UserRound size={18} />
              </span>
              <span className="prof-menu-text">
                <strong>Back to Profile</strong>
              </span>
              <span className="prof-menu-arrow">
                <ChevronRight size={14} />
              </span>
            </button>
          </div>
        </div>

        <RegisteredBottomNav active="profile" />
      </div>
    )
  }

  // ══════════════════════════════════════════════════════════════════════════════
  // ── RENDER: Main view ─────────────────────────────────────────────────────────
  // ══════════════════════════════════════════════════════════════════════════════
  return (
    <div className="prof-page">
      {/* ── Blue hero ──────────────────────────────────────────────────── */}
      <div className="prof-hero">
        {/* Top bar */}
        <div className="prof-hero-bar">
          <Link href="/home" id="profile-back-btn" className="prof-hero-back" aria-label="Back to home">
            <ArrowLeft size={18} />
          </Link>
          <span className="prof-hero-title">Profile</span>
        </div>

        {/* Avatar with camera button */}
        <div className="prof-avatar-wrap">
          <AvatarImage size="large" />
          {/* Camera overlay — quick upload from main view */}
          <label
            id="profile-avatar-upload-btn"
            className={`prof-avatar-cam${avatarUploading ? ' prof-uploading' : ''}`}
            aria-label="Change profile photo"
          >
            <Camera size={13} />
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif"
              onChange={handleAvatarChange}
              aria-hidden="true"
            />
          </label>
        </div>

        {/* Name & role */}
        <p className="prof-name" id="profile-display-name">
          {profile?.name ?? 'No name set'}
        </p>
        <p className="prof-role">{roleLabel}</p>

        {/* Completed badge */}
        <div className="prof-badge">
          <span className="prof-badge-check">
            <Check size={13} />
          </span>
          {completedCount} {completedCount === 1 ? 'story' : 'stories'} completed
        </div>
      </div>

      {/* ── Stats row ─────────────────────────────────────────────────── */}
      <div className="prof-stats" role="group" aria-label="User statistics">
        <div className="prof-stat">
          <strong id="stat-stories">{completedCount}</strong>
          <span>Stories</span>
        </div>
        <div className="prof-stat-divider" />
        <div className="prof-stat">
          <strong id="stat-points">{totalPoints}</strong>
          <span>Points</span>
        </div>
        <div className="prof-stat-divider" />
        <div className="prof-stat">
          <strong id="stat-goals">{goalCount}</strong>
          <span>Goals</span>
        </div>
      </div>

      {/* ── Menu card ─────────────────────────────────────────────────── */}
      <div className="prof-menu-card" role="navigation" aria-label="Profile navigation">
        {/* Profile Details */}
        <button
          id="profile-details-btn"
          className="prof-menu-row"
          onClick={() => setView('details')}
        >
          <span className="prof-menu-icon">
            <UserRound size={18} />
          </span>
          <span className="prof-menu-text">
            <strong>Profile Details</strong>
          </span>
          <span className="prof-menu-arrow">
            <ChevronRight size={14} />
          </span>
        </button>

        {/* Settings */}
        <button
          id="profile-settings-btn"
          className="prof-menu-row"
          onClick={() => setView('settings')}
        >
          <span className="prof-menu-icon">
            <Settings size={18} />
          </span>
          <span className="prof-menu-text">
            <strong>Settings</strong>
          </span>
          <span className="prof-menu-arrow">
            <ChevronRight size={14} />
          </span>
        </button>

        {/* Log out */}
        <button
          id="profile-logout-btn"
          className="prof-menu-row"
          onClick={handleLogOut}
        >
          <span className="prof-menu-icon logout">
            <LogOut size={18} />
          </span>
          <span className="prof-menu-text">
            <strong>Log out</strong>
          </span>
          <span className="prof-menu-arrow">
            <ChevronRight size={14} />
          </span>
        </button>
      </div>

      <RegisteredBottomNav active="profile" />
    </div>
  )
}