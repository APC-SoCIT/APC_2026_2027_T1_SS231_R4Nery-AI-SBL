'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Search, SlidersHorizontal, CheckCircle2, ChevronRight } from 'lucide-react'
import { useSession } from '@/lib/sessionContext'
import { RegisteredBottomNav } from '@/components/nav/registered-bottom-nav'
import { createClient } from '@/lib/supabase/client'

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

  // ── Auth guard ─────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!sessionLoading && !session) router.replace('/sign-in')
  }, [session, sessionLoading, router])

  // ── Load completed stories ─────────────────────────────────────────────────
  useEffect(() => {
    if (!session) return
    async function load() {
      setLoading(true)
      try {
        const supabase = createClient()
        const { data: progressData } = await supabase
          .from('user_progress')
          .select('completed_modules, updated_at')
          .eq('user_id', session!.userId)
          .maybeSingle()

        const completedIds: string[] = progressData?.completed_modules ?? []
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
              completedAt: progressData?.updated_at ?? null,
            }))
          setStories(ordered)
        }
      } catch {
        // Non-fatal
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [session])

  if (sessionLoading || !session) return null

  const filtered = stories.filter((s) => {
    const matchSearch = s.title.toLowerCase().includes(search.toLowerCase())
    const matchLevel = filterLevel ? s.level === filterLevel : true
    return matchSearch && matchLevel
  })

  const levels = Array.from(new Set(stories.map((s) => s.level).filter(Boolean)))

  return (
    <main className="archive-page">
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
          <div className="archive-stack-list">
            {filtered.map((story, i) => {
              const bg = story.color
              const tc = textColorFor(bg)
              const isExpanded = expandedId === story.id
              const isLast = i === filtered.length - 1

              return (
                <div
                  key={story.id}
                  className={`archive-stack-card${isExpanded ? ' expanded' : ''}`}
                  style={{
                    '--card-bg': bg,
                    '--card-tc': tc,
                    zIndex: filtered.length + 1 - i,
                  } as React.CSSProperties}
                  onClick={() => setExpandedId(isExpanded ? null : story.id)}
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

                  {/* Wave divider — every card except the last gets a wavy overlap */}
                  {!isLast && (
                    <svg
                      className="archive-card-wave"
                      viewBox="0 0 390 40"
                      preserveAspectRatio="none"
                      aria-hidden="true"
                    >
                      <path
                        d="M0,0 C50,40 100,0 150,20 C200,40 250,0 300,20 C330,34 360,12 390,20 L390,40 L0,40 Z"
                        fill={filtered[i + 1]?.color}
                      />
                    </svg>
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
