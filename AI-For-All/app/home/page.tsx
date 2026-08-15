'use client'

import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Bookmark, BookOpen, ChevronRight } from 'lucide-react'
import { getMockSession, type MockUser } from '@/lib/mock-auth'
import { RegisteredBottomNav } from '@/components/nav/registered-bottom-nav'

type Snap = 'hero' | 'default' | 'expanded'
const SNAP_TOP: Record<Snap, number> = { hero: 60, default: 40, expanded: 10 }
const SNAP_ORDER: Snap[] = ['hero', 'default', 'expanded']

const goalItems = [
  { key: 'basics', icon: '/ai-for-all/goal-icon-target.png', title: 'Understand AI Basics', progress: '2 of 5 stories completed', percent: 40 },
  { key: 'helps-us', icon: '/ai-for-all/goal-icon-brain.png', title: 'How AI Helps Us', progress: '1 of 4 stories completed', percent: 25 },
]

const completedItems = [
  { key: 'study-buddy', title: 'Study Buddy', color: '#6f8ce8' },
  { key: 'train-bot', title: 'Train Your Bot', color: '#ff7a45' },
]

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

export default function HomePage() {
  const router = useRouter()
  const [user, setUser] = useState<MockUser | null | 'checking'>('checking')
  const [snap, setSnap] = useState<Snap>('default')
  const [dragTop, setDragTop] = useState<number | null>(null)
  const startYRef = useRef<number | null>(null)
  const startTopRef = useRef<number>(SNAP_TOP.default)

  useEffect(() => {
    const session = getMockSession()
    if (!session) {
      router.replace('/sign-in')
      return
    }
    setUser(session)
  }, [router])

  if (user === 'checking' || user === null) return null

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
          <div className="home-stats">
            <div className="home-stat home-stat-purple">
              <strong>3</strong>
              <span>Stories</span>
              <small>Continue learning</small>
            </div>
            <div className="home-stat home-stat-peach">
              <strong>2</strong>
              <span>Goals</span>
              <small>In progress</small>
            </div>
            <div className="home-stat home-stat-blue">
              <strong>
                48<span className="unit">mins</span>
              </strong>
              <span>This week</span>
              <small>Keep it up!</small>
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

          <h3 className="home-section-title">Goal Board</h3>
          <div className="home-goal-list">
            {goalItems.map((goal) => (
              <div className="home-goal-item" key={goal.key}>
                <img src={goal.icon} alt="" className="home-goal-icon" />
                <span className="home-goal-text">
                  <strong>{goal.title}</strong>
                  <small>{goal.progress}</small>
                </span>
                <ProgressRing percent={goal.percent} />
              </div>
            ))}
          </div>

          <div className="home-section-heading">
            <h3 className="home-section-title">Completed Stories</h3>
            <Link href="/archive" className="home-view-all">
              View all <ChevronRight size={14} />
            </Link>
          </div>
          <div className="home-completed-list">
            {completedItems.map((item) => (
              <div className="home-completed-item" key={item.key}>
                <span className="home-completed-swatch" style={{ background: item.color }} />
                <span className="home-completed-text">
                  <strong>{item.title}</strong>
                  <small>Completed</small>
                </span>
                <Bookmark size={18} className="home-completed-bookmark" />
              </div>
            ))}
          </div>
        </div>
      </div>

      <RegisteredBottomNav active="home" />
    </main>
  )
}