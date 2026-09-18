'use client'

import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Bookmark, BookOpen, ChevronRight } from 'lucide-react'
import { useSession } from '@/lib/sessionContext'
import { RegisteredBottomNav } from '@/components/nav/registered-bottom-nav'
import { createClient } from '@/lib/supabase/client'

type Snap = 'hero' | 'default' | 'expanded'
const SNAP_TOP: Record<Snap, number> = { hero: 60, default: 40, expanded: 10 }
const SNAP_ORDER: Snap[] = ['hero', 'default', 'expanded']

interface UserProgress {
  completedModules: string[]
  totalPoints: number
}

interface StoryInfo {
  id: string
  title: string
  color: string
}

function ProgressRing({ percent }: { percent: number }) {
  const r = 16
  const c = 2 * Math.PI * r
  const offset = c - (percent / 100) * c
  return (
    <svg width="40" height="40" viewBox="0 0 40 40" aria-hidden="true">
      <circle cx="20" cy="20" r={r} fill="none" stroke="#e7ecfb" strokeWidth="4" />
      <circle
        cx="20"
        cy="20"
        r={r}
        fill="none"
        stroke="#ff9a4d"
        strokeWidth="4"
        strokeDasharray={c}
        strokeDashoffset={offset}
        strokeLinecap="round"
        transform="rotate(-90 20 20)"
      />
    </svg>
  )
}

const STORY_COLORS: Record<string, string> = {
  'story-study-buddy': '#6f8ce8',
  'story-train-your-bot': '#ff7a45',
  'story-trust-the-system': '#66cf9e',
}

function colorForStory(id: string): string {
  return STORY_COLORS[id] ?? '#8dcdf4'
}

export default function HomePage() {
  const router = useRouter()
  const { session, loading: sessionLoading } = useSession()
  const [progress, setProgress] = useState<UserProgress | null>(null)
  const [allStories, setAllStories] = useState<StoryInfo[]>([])
  const [progressLoading, setProgressLoading] = useState(true)
  const [displayName, setDisplayName] = useState<string>('')

  const [snap, setSnap] = useState<Snap>('default')
  const [dragTop, setDragTop] = useState<number | null>(null)
  const startYRef = useRef<number | null>(null)
  const startTopRef = useRef<number>(SNAP_TOP.default)

  // ── Redirect if not authenticated ─────────────────────────────────────────
  useEffect(() => {
    if (!sessionLoading && !session) {
      router.replace('/sign-in')
    }
  }, [session, sessionLoading, router])

  // ── Fetch real user name from the users table ──────────────────────────────
  useEffect(() => {
    if (!session) return
    async function fetchName() {
      const supabase = createClient()
      const { data } = await supabase
        .from('users')
        .select('username')
        .eq('user_id', session!.userId)
        .maybeSingle()
      if (data?.username) {
        setDisplayName(data.username)
      } else {
        // Fallback: use the email prefix
        const { data: { user } } = await supabase.auth.getUser()
        setDisplayName(user?.email?.split('@')[0] ?? 'Learner')
      }
    }
    fetchName()
  }, [session])

  // ── Fetch real per-user progress ───────────────────────────────────────────
  useEffect(() => {
    if (!session) return
    async function loadProgress() {
      setProgressLoading(true)
      try {
        const res = await fetch('/api/progress')
        if (res.ok) {
          const data = await res.json()
          setProgress(data)
        }
      } catch {
        // Non-fatal — show empty progress on error
      } finally {
        setProgressLoading(false)
      }
    }
    loadProgress()
  }, [session])

  // ── Fetch published story list to show titles for completed stories ─────────
  useEffect(() => {
    if (!session) return
    async function loadStories() {
      const supabase = createClient()
      const { data } = await supabase
        .from('stories')
        .select('id, title, color')
        .eq('status', 'Published')
        .order('created_at', { ascending: false })
      if (data) {
        setAllStories(data.map((s: any) => ({
          id: s.id,
          title: s.title,
          color: s.color || colorForStory(s.id),
        })))
      }
    }
    loadStories()
  }, [session])

  // ── Show nothing while session is initialising ─────────────────────────────
  if (sessionLoading || !session) return null

  // ── Derive stats from real data ────────────────────────────────────────────
  const completedIds: string[] = progress?.completedModules ?? []
  const completedCount = completedIds.length
  const totalStories = allStories.length || 3 // fallback when stories haven't loaded yet
  const completedStories: StoryInfo[] = completedIds
    .map((id) => allStories.find((s) => s.id === id))
    .filter((s): s is StoryInfo => !!s)

  // Derive a simple goal progress: user is working toward completing all published stories
  const goalPercent = totalStories > 0 ? Math.round((completedCount / totalStories) * 100) : 0
  const goalItems = [
    {
      key: 'all-stories',
      icon: '/ai-for-all/goal-icon-target.png',
      title: 'Understand AI Basics',
      progress: `${completedCount} of ${totalStories} stories completed`,
      percent: goalPercent,
    },
  ]

  const currentTop = dragTop ?? SNAP_TOP[snap]

  function toVh(px: number) {
    return (px / window.innerHeight) * 100
  }
  function onPointerDown(e: ReactPointerEvent<HTMLDivElement>) {
    startYRef.current = e.clientY
    startTopRef.current = currentTop
    e.currentTarget.setPointerCapture(e.pointerId)
  }
  function onPointerMove(e: ReactPointerEvent<HTMLDivElement>) {
    if (startYRef.current === null) return
    const deltaVh = toVh(e.clientY - startYRef.current)
    const next = Math.min(SNAP_TOP.hero, Math.max(SNAP_TOP.expanded, startTopRef.current + deltaVh))
    setDragTop(next)
  }
  function onPointerUp() {
    if (dragTop === null) {
      startYRef.current = null
      return
    }
    let nearest: Snap = 'default'
    let nearestDist = Infinity
    for (const key of SNAP_ORDER) {
      const dist = Math.abs(SNAP_TOP[key] - dragTop)
      if (dist < nearestDist) {
        nearestDist = dist
        nearest = key
      }
    }
    setSnap(nearest)
    setDragTop(null)
    startYRef.current = null
  }
  function cycleSnap() {
    const index = SNAP_ORDER.indexOf(snap)
    setSnap(SNAP_ORDER[(index + 1) % SNAP_ORDER.length])
  }

  return (
    <main className="home-page">
      <div className="home-hero">
        <p className="home-hero-title">AI for All</p>
        <p className="home-hero-subtitle">Explore through stories</p>
      </div>

      <img
        className="home-mascot"
        style={{ top: `calc(${currentTop}vh - 126px)` }}
        src="/ai-for-all/Story-Ai-Mascot.png"
        alt=""
        aria-hidden="true"
      />

      <div
        className="home-sheet"
        style={{ top: `${currentTop}vh`, transition: dragTop === null ? 'top .28s cubic-bezier(.2,.8,.2,1)' : 'none' }}
      >
        <div className="home-sheet-grab" onPointerDown={onPointerDown} onPointerMove={onPointerMove} onPointerUp={onPointerUp}>
          <button type="button" className="home-sheet-handle" onClick={cycleSnap} aria-label="Expand or collapse dashboard">
            <span />
          </button>
        </div>

        <div className="home-sheet-content">
          {/* Greeting */}
          {displayName && (
            <p className="home-greeting">
              Hi, <strong>{displayName}!</strong>
            </p>
          )}

          {/* Stats — real per-user data */}
          <div className="home-stats">
            <div className="home-stat home-stat-purple">
              <strong>{progressLoading ? '…' : completedCount}</strong>
              <span>Completed</span>
              <small>Stories done</small>
            </div>
            <div className="home-stat home-stat-peach">
              <strong>{progressLoading ? '…' : Math.max(0, totalStories - completedCount)}</strong>
              <span>Remaining</span>
              <small>Stories left</small>
            </div>
            <div className="home-stat home-stat-blue">
              <strong>
                {progressLoading ? '…' : (progress?.totalPoints ?? 0)}
                <span className="unit">pts</span>
              </strong>
              <span>Points</span>
              <small>Keep learning!</small>
            </div>
          </div>

          <Link href="/stories" className="home-explore">
            <span className="home-explore-icon">
              <BookOpen size={18} />
            </span>
            <span className="home-explore-text">
              <strong>Explore Stories</strong>
              <small>Choose your next AI adventure</small>
            </span>
            <span className="home-explore-arrow">
              <ChevronRight size={16} />
            </span>
          </Link>

          {/* Goal Board — shows real progress */}
          <h3 className="home-section-title">Goal Board</h3>
          <div className="home-goal-list">
            {goalItems.map((goal) => (
              <div className="home-goal-item" key={goal.key}>
                <img src={goal.icon} alt="" className="home-goal-icon" />
                <span className="home-goal-text">
                  <strong>{goal.title}</strong>
                  <small>{progressLoading ? 'Loading…' : goal.progress}</small>
                </span>
                <ProgressRing percent={progressLoading ? 0 : goal.percent} />
              </div>
            ))}
          </div>

          {/* Completed Stories — real per-user list */}
          <div className="home-section-heading">
            <h3 className="home-section-title">Completed Stories</h3>
            <Link href="/archive" className="home-view-all">
              View all <ChevronRight size={14} />
            </Link>
          </div>
          <div className="home-completed-list">
            {progressLoading ? (
              <p style={{ color: 'var(--muted)', fontSize: 13, padding: '8px 0' }}>Loading…</p>
            ) : completedStories.length === 0 ? (
              <p style={{ color: 'var(--muted)', fontSize: 13, padding: '8px 0' }}>
                No stories completed yet — start one!
              </p>
            ) : (
              completedStories.slice(0, 3).map((item) => (
                <div className="home-completed-item" key={item.id}>
                  <span className="home-completed-swatch" style={{ background: item.color }} />
                  <span className="home-completed-text">
                    <strong>{item.title}</strong>
                    <small>Completed</small>
                  </span>
                  <Bookmark size={18} className="home-completed-bookmark" />
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      <RegisteredBottomNav active="home" />
    </main>
  )
}