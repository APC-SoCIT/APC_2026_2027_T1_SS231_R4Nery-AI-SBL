'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Search, SlidersHorizontal, CheckCircle2, ChevronRight } from 'lucide-react'
import { useSession } from '@/lib/sessionContext'
import { RegisteredBottomNav } from '@/components/nav/registered-bottom-nav'
import { createClient } from '@/lib/supabase/client'
import { FALLBACK_COLORS } from '@/app/stories/page'

interface ArchivedStory {
  id: string
  title: string
  color: string
  category: string
  level: string
  completedAt: string | null
}

/** Compute relative luminance so text contrast works for any hex colour. */
function textColorFor(hex: string): string {
  const c = hex.replace('#', '')
  const r = parseInt(c.slice(0, 2), 16) / 255
  const g = parseInt(c.slice(2, 4), 16) / 255
  const b = parseInt(c.slice(4, 6), 16) / 255
  const toLinear = (v: number) => v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4
  const L = 0.2126 * toLinear(r) + 0.7152 * toLinear(g) + 0.0722 * toLinear(b)
  return L > 0.35 ? '#17244a' : '#ffffff'
}

export default function ArchivePage() {
  const router = useRouter()
  const { session, loading: sessionLoading } = useSession()
  const [stories, setStories] = useState<ArchivedStory[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [filterOpen, setFilterOpen] = useState(false)
  const [filterLevel, setFilterLevel] = useState<string | null>(null)
  const listRef = useRef<HTMLDivElement>(null)
  const wheelRafRef = useRef<number | null>(null)
  const dragRef = useRef<{ startY: number; startScroll: number; pointerId: number } | null>(null)
  const dragMovedRef = useRef(false)

  // ── Wheel-like stack: cards farther from the middle of the scroll area shrink slightly ──
  function updateWheel() {
    const list = listRef.current
    if (!list) return
    const scrollable = list.scrollHeight > list.clientHeight + 1
    const center = list.scrollTop + list.clientHeight / 2
    const half = Math.max(1, list.clientHeight / 2)
    Array.from(list.children).forEach((child) => {
      const el = child as HTMLElement
      const mid = el.offsetTop + el.offsetHeight / 2
      const d = scrollable ? Math.min(1, Math.abs(mid - center) / half) : 0
      el.style.setProperty('--wheel', d.toFixed(3))
    })
  }

  function onListScroll() {
    if (wheelRafRef.current !== null) return
    wheelRafRef.current = requestAnimationFrame(() => {
      wheelRafRef.current = null
      updateWheel()
    })
  }

  // ── Mouse drag to browse the stack (touch uses native swipe scrolling) ────
  function onListPointerDown(e: React.PointerEvent<HTMLDivElement>) {
    dragMovedRef.current = false
    const list = listRef.current
    if (!list || e.pointerType !== 'mouse' || e.button !== 0) return
    dragRef.current = { startY: e.clientY, startScroll: list.scrollTop, pointerId: e.pointerId }
  }

  function onListPointerMove(e: React.PointerEvent<HTMLDivElement>) {
    const drag = dragRef.current
    const list = listRef.current
    if (!drag || !list) return
    const dy = e.clientY - drag.startY
    if (!dragMovedRef.current) {
      if (Math.abs(dy) < 5) return
      dragMovedRef.current = true
      list.setPointerCapture(drag.pointerId)
      list.classList.add('is-dragging')
    }
    list.scrollTop = drag.startScroll - dy
  }

  function onListPointerUp() {
    dragRef.current = null
    listRef.current?.classList.remove('is-dragging')
  }

  useEffect(() => {
    updateWheel()
    window.addEventListener('resize', updateWheel)
    return () => window.removeEventListener('resize', updateWheel)
  }, [stories, search, filterLevel, expandedId, loading])

  // Keep a newly expanded card's details in view inside the scrollable stack
  useEffect(() => {
    if (!expandedId) return
    const el = listRef.current?.querySelector('.archive-stack-card.expanded') as HTMLElement | null
    el?.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
  }, [expandedId])

  // ── Auth guard ─────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!sessionLoading && (!session || session.isGuest)) router.replace('/sign-in')
  }, [session, sessionLoading, router])

  // ── Load completed stories ─────────────────────────────────────────────────
  useEffect(() => {
    if (!session) return
    async function load() {
      setLoading(true)
      try {
        const supabase = createClient()
        // Same source of truth as Home: /api/progress (progress + mall_goers tables)
        const res = await fetch('/api/progress')
        if (!res.ok) throw new Error(`Failed to load progress (${res.status})`)
        const progressData: { completedModules?: string[]; completedDates?: Record<string, string> } = await res.json()

        const completedIds: string[] = progressData?.completedModules ?? []
        if (completedIds.length === 0) {
          setStories([])
          setLoading(false)
          return
        }

        const { data: storiesData } = await supabase
          .from('stories')
          .select('id, title, color, category, level')
          .in('id', completedIds)

        if (storiesData) {
          const ordered = completedIds
            .map((id) => storiesData.find((s: any) => s.id === id))
            .filter(Boolean)
            .map((s: any) => ({
              id: s.id,
              title: s.title,
              color: s.color ?? '#8dcdf4',
              category: s.category ?? '',
              level: s.level ?? '',
              completedAt: progressData?.completedDates?.[s.id] ?? null,
            }))
          setStories(ordered)
        }
      } catch (err) {
        // Non-fatal
        console.error('Archive: could not load completed stories', err)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [session])

  if (sessionLoading || !session || session.isGuest) return null

  const filtered = stories.filter((s) => {
    const matchSearch = s.title.toLowerCase().includes(search.toLowerCase())
    const matchLevel = filterLevel ? s.level === filterLevel : true
    return matchSearch && matchLevel
  })

  const levels = Array.from(new Set(stories.map((s) => s.level).filter(Boolean)))
  // 1 or 2 stories: taller, centered folders. 3+: scrollable wheel-like stack.
  const fewStories = filtered.length <= 2

  return (
    <main className={`archive-page${!loading && !fewStories ? ' archive-page--stack-scroll' : ''}`}>
      {/* ── Header ─────────────────────────────────────────────── */}
      <div className="archive-header">
        <h1 className="archive-title">My Archive</h1>
        <div className="archive-controls">
          <div className="archive-search-bar">
            <Search size={16} className="archive-search-icon" />
            <input
              id="archive-search-input"
              type="search"
              placeholder=""
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              aria-label="Search archived stories"
              className="archive-search-input"
            />
          </div>
          <div className="archive-filter-wrap">
            <button
              id="archive-filter-btn"
              type="button"
              className={`archive-filter-btn${filterOpen || filterLevel ? ' active' : ''}`}
              onClick={() => setFilterOpen((o) => !o)}
              aria-label="Filter stories"
              aria-expanded={filterOpen}
            >
              <SlidersHorizontal size={18} />
            </button>
            {filterOpen && (
              <div className="archive-filter-menu" role="menu">
                <button
                  role="menuitem"
                  className={filterLevel === null ? 'active' : ''}
                  onClick={() => { setFilterLevel(null); setFilterOpen(false) }}
                >
                  All levels
                </button>
                {levels.map((lvl) => (
                  <button
                    key={lvl}
                    role="menuitem"
                    className={filterLevel === lvl ? 'active' : ''}
                    onClick={() => { setFilterLevel(lvl); setFilterOpen(false) }}
                  >
                    {lvl}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Body ───────────────────────────────────────────────── */}
      <div className="archive-body">
        {loading ? (
          <p className="archive-empty">Loading your archive…</p>
        ) : filtered.length === 0 ? (
          <div className="archive-empty-state">
            <p className="archive-empty">
              {stories.length === 0
                ? "You haven't completed any stories yet."
                : 'No stories match your search.'}
            </p>
            {stories.length === 0 && (
              <Link href="/stories" className="archive-cta">
                Explore Stories
              </Link>
            )}
          </div>
        ) : (
          <div
            ref={listRef}
            className={`archive-stack-list${fewStories ? ' archive-stack-list--few' : ' archive-stack-list--scroll'}`}
            onScroll={onListScroll}
            onPointerDown={onListPointerDown}
            onPointerMove={onListPointerMove}
            onPointerUp={onListPointerUp}
            onPointerCancel={onListPointerUp}
          >
            {filtered.map((story, i) => {
              // Same repeating palette as Select Story, by position, so neighbouring cards always differ
              const bg = FALLBACK_COLORS[i % FALLBACK_COLORS.length]
              const tc = textColorFor(bg)
              const isExpanded = expandedId === story.id

              return (
                <div
                  key={story.id}
                  className={`archive-stack-card${isExpanded ? ' expanded' : ''}`}
                  style={{
                    '--card-bg': bg,
                    '--card-tc': tc,
                    // Later cards sit on top of earlier ones so each bookmark's notched top overlaps the card above
                    zIndex: i + 1,
                  } as React.CSSProperties}
                  onClick={() => {
                    // Ignore the click that ends a mouse drag through the stack
                    if (dragMovedRef.current) return
                    setExpandedId(isExpanded ? null : story.id)
                  }}
                  role="button"
                  tabIndex={0}
                  aria-expanded={isExpanded}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault()
                      setExpandedId(isExpanded ? null : story.id)
                    }
                  }}
                >
                  {/* Main row */}
                  <div className="archive-card-inner">
                    <span className="archive-card-title">{story.title}</span>
                    <span className="archive-card-percent">100%</span>
                  </div>

                  {/* Expanded detail */}
                  {isExpanded && (
                    <div
                      className="archive-card-detail"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <div className="archive-card-tags">
                        {story.category && (
                          <span className="archive-tag">{story.category}</span>
                        )}
                        {story.level && (
                          <span className="archive-tag">{story.level}</span>
                        )}
                      </div>
                      <div className="archive-card-footer">
                        {story.completedAt && (
                          <span className="archive-card-date">
                            <CheckCircle2 size={14} className="archive-check-icon" />
                            Completed{' '}
                            {new Date(story.completedAt).toLocaleDateString('en-US', {
                              month: 'long',
                              day: 'numeric',
                              year: 'numeric',
                            })}
                          </span>
                        )}
                        <Link
                          href={`/stories/${story.id}`}
                          className="archive-card-replay"
                          aria-label={`Replay ${story.title}`}
                          onClick={(e) => e.stopPropagation()}
                        >
                          <ChevronRight size={16} />
                        </Link>
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>

      <RegisteredBottomNav active="archive" />
    </main>
  )
}