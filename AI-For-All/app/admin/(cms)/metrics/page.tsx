'use client'

import { useState, useEffect, useMemo, useCallback, Fragment } from 'react'
import {
  BarChart3, Users, ExternalLink, RefreshCw, Search,
  TrendingUp, Smile, Sparkles, ChevronDown, ChevronRight,
  ChevronLeft, ChevronsLeft, ChevronsRight
} from 'lucide-react'
import toast from 'react-hot-toast'
import { StoryMetricsResponse } from '@/lib/supabase/metrics'
import { STORY_REACTIONS } from '@/lib/reactions'

type MetricTab = 'handoff' | 'reactions'
const METRICS_PER_PAGE = 10

// Helper to format sentiment colors
const REACTION_COLORS: Record<string, string> = {
  hooked: '#10b981',
  enjoying: '#06b6d4',
  curious: '#3b82f6',
  learning: '#8b5cf6',
  neutral: '#6b7280',
  unsure: '#f59e0b',
  confused: '#f97316',
  slow: '#eab308',
  bored: '#94a3b8',
  overwhelmed: '#ec4899',
  losing_interest: '#ef4444',
  try_another: '#84cc16',
}

const REACTION_EMOJIS: Record<string, string> = {
  hooked: '🤩',
  enjoying: '😊',
  curious: '🤔',
  learning: '💡',
  neutral: '😐',
  unsure: '😕',
  confused: '😵‍💫',
  slow: '🐢',
  bored: '🥱',
  overwhelmed: '🤯',
  losing_interest: '📉',
  try_another: '🔄',
}

// ── Reusable Pagination Bar ──────────────────────────────────────────────────
function PaginationBar({
  currentPage,
  totalItems,
  itemsPerPage,
  onPageChange,
}: {
  currentPage: number
  totalItems: number
  itemsPerPage: number
  onPageChange: (page: number) => void
}) {
  const totalPages = Math.max(1, Math.ceil(totalItems / itemsPerPage))
  if (totalItems === 0) return null

  const startItem = (currentPage - 1) * itemsPerPage + 1
  const endItem = Math.min(currentPage * itemsPerPage, totalItems)

  const btnStyle = (disabled: boolean): React.CSSProperties => ({
    display: 'grid',
    placeItems: 'center',
    minWidth: 32,
    height: 32,
    borderRadius: 8,
    border: '1px solid var(--line, #cbd5e1)',
    background: '#ffffff',
    color: disabled ? '#94a3b8' : '#334155',
    cursor: disabled ? 'not-allowed' : 'pointer',
    opacity: disabled ? 0.4 : 1,
    padding: '0 6px',
    fontSize: 12,
    transition: 'all .12s ease',
  })

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '12px 20px',
        borderTop: '1px solid var(--line, #e2e8f0)',
        background: '#fafbfc',
        flexWrap: 'wrap',
        gap: 12,
      }}
    >
      <span style={{ fontSize: 12, color: 'var(--muted, #64748b)' }}>
        Showing {startItem}–{endItem} of {totalItems} stor{totalItems !== 1 ? 'ies' : 'y'}
      </span>

      {totalPages > 1 && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <button
            type="button"
            onClick={() => onPageChange(1)}
            disabled={currentPage === 1}
            style={btnStyle(currentPage === 1)}
            title="First Page"
          >
            <ChevronsLeft size={14} />
          </button>
          <button
            type="button"
            onClick={() => onPageChange(Math.max(1, currentPage - 1))}
            disabled={currentPage === 1}
            style={btnStyle(currentPage === 1)}
            title="Previous Page"
          >
            <ChevronLeft size={14} />
          </button>

          {Array.from({ length: totalPages }, (_, i) => i + 1)
            .filter((n) => n === 1 || n === totalPages || Math.abs(n - currentPage) <= 1)
            .reduce<(number | '…')[]>((acc, n, idx, arr) => {
              if (idx > 0 && n - (arr[idx - 1] as number) > 1) acc.push('…')
              acc.push(n)
              return acc
            }, [])
            .map((n, i) =>
              n === '…' ? (
                <span key={`e-${i}`} style={{ padding: '0 4px', fontSize: 12, color: '#94a3b8' }}>
                  …
                </span>
              ) : (
                <button
                  type="button"
                  key={n}
                  onClick={() => onPageChange(n as number)}
                  style={{
                    ...btnStyle(false),
                    minWidth: 32,
                    height: 32,
                    fontWeight: 700,
                    background: currentPage === n ? '#6366f1' : '#ffffff',
                    color: currentPage === n ? '#ffffff' : '#334155',
                    borderColor: currentPage === n ? '#6366f1' : '#cbd5e1',
                  }}
                >
                  {n}
                </button>
              )
            )}

          <button
            type="button"
            onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
            disabled={currentPage === totalPages}
            style={btnStyle(currentPage === totalPages)}
            title="Next Page"
          >
            <ChevronRight size={14} />
          </button>
          <button
            type="button"
            onClick={() => onPageChange(totalPages)}
            disabled={currentPage === totalPages}
            style={btnStyle(currentPage === totalPages)}
            title="Last Page"
          >
            <ChevronsRight size={14} />
          </button>
        </div>
      )}
    </div>
  )
}

export default function AdminMetricsPage() {
  const [data, setData] = useState<StoryMetricsResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<'All' | 'Published' | 'Draft' | 'Archived'>('All')
  const [activeTab, setActiveTab] = useState<MetricTab>('handoff')
  const [expandedStoryId, setExpandedStoryId] = useState<string | null>(null)
  const [lastRefreshed, setLastRefreshed] = useState<Date>(new Date())
  const [currentPage, setCurrentPage] = useState(1)

  const loadMetrics = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/admin/metrics')
      if (!res.ok) {
        throw new Error('Failed to load metrics')
      }
      const json: StoryMetricsResponse = await res.json()
      setData(json)
      setLastRefreshed(new Date())
    } catch (err: any) {
      console.error('Failed to load metrics:', err)
      toast.error('Could not load metrics: ' + (err.message || 'Network error'))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadMetrics()
  }, [loadMetrics])

  // Reset page when filters or tabs change
  useEffect(() => {
    setCurrentPage(1)
  }, [search, statusFilter, activeTab])

  // Filtered stories
  const filteredStories = useMemo(() => {
    if (!data?.stories) return []
    return data.stories.filter((story) => {
      const matchesSearch =
        story.title.toLowerCase().includes(search.toLowerCase()) ||
        story.category.toLowerCase().includes(search.toLowerCase())
      const matchesStatus = statusFilter === 'All' || story.status.toLowerCase() === statusFilter.toLowerCase()
      return matchesSearch && matchesStatus
    })
  }, [data, search, statusFilter])

  // Stories sorted by handoff CTR desc
  const storiesByHandoff = useMemo(() => {
    return [...filteredStories].sort((a, b) => {
      // First prioritize stories with links
      if (a.hasHandoffLink && !b.hasHandoffLink) return -1
      if (!a.hasHandoffLink && b.hasHandoffLink) return 1
      return b.clickPercentage - a.clickPercentage || b.totalReactors - a.totalReactors
    })
  }, [filteredStories])

  // Stories sorted by reaction count desc
  const storiesByReactions = useMemo(() => {
    return [...filteredStories].sort((a, b) => b.totalReactors - a.totalReactors)
  }, [filteredStories])

  // Current active list for pagination
  const activeList = activeTab === 'handoff' ? storiesByHandoff : storiesByReactions
  const paginatedStories = useMemo(() => {
    const start = (currentPage - 1) * METRICS_PER_PAGE
    return activeList.slice(start, start + METRICS_PER_PAGE)
  }, [activeList, currentPage])

  const summary = data?.summary

  return (
    <div className="dash-root" style={{ paddingBottom: 60 }}>
      {/* Page Header */}
      <div className="dash-page-header">
        <div>
          <h1 className="dash-page-title" style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <BarChart3 size={24} color="#6366f1" />
            Story Reactions &amp; IBM Handoff Metrics
          </h1>
          <p className="dash-page-sub">
            {loading ? 'Crunching analytics...' : `Live metrics updated at ${lastRefreshed.toLocaleTimeString()}`}
          </p>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button className="dash-refresh-btn" onClick={loadMetrics} disabled={loading}>
            <RefreshCw size={15} className={loading ? 'dash-spin' : ''} />
            Refresh
          </button>
        </div>
      </div>

      {/* Top KPI Cards Row */}
      <div className="dash-kpi-row" style={{ gridTemplateColumns: 'repeat(4, 1fr)' }}>
        {/* Total Reactions */}
        <div className="dash-kpi-card">
          <div className="dash-kpi-icon" style={{ background: '#6366f120', color: '#6366f1' }}>
            <Smile size={22} />
          </div>
          <div className="dash-kpi-body">
            <span className="dash-kpi-label">Total Reactions</span>
            <strong className="dash-kpi-value">{summary?.totalReactions ?? 0}</strong>
            <span className="dash-kpi-sub">
              {summary?.totalRegisteredReactions ?? 0} registered &middot; {summary?.totalGuestReactions ?? 0} guests
            </span>
          </div>
        </div>

        {/* Registered Learner Reactions */}
        <div className="dash-kpi-card">
          <div className="dash-kpi-icon" style={{ background: '#3b82f620', color: '#3b82f6' }}>
            <Users size={22} />
          </div>
          <div className="dash-kpi-body">
            <span className="dash-kpi-label">Registered Reactors</span>
            <strong className="dash-kpi-value">{summary?.totalRegisteredReactions ?? 0}</strong>
            <span className="dash-kpi-sub">
              {summary?.uniqueRegisteredReactors ?? 0} unique authenticated users
            </span>
          </div>
        </div>

        {/* Guest Reactions */}
        <div className="dash-kpi-card">
          <div className="dash-kpi-icon" style={{ background: '#10b98120', color: '#10b981' }}>
            <Sparkles size={22} />
          </div>
          <div className="dash-kpi-body">
            <span className="dash-kpi-label">Guest Reactions</span>
            <strong className="dash-kpi-value">{summary?.totalGuestReactions ?? 0}</strong>
            <span className="dash-kpi-sub">Anonymous kiosk / mallgoer check-ins</span>
          </div>
        </div>

        {/* IBM Handoff Click Through Rate */}
        <div className="dash-kpi-card">
          <div className="dash-kpi-icon" style={{ background: '#f59e0b20', color: '#f59e0b' }}>
            <TrendingUp size={22} />
          </div>
          <div className="dash-kpi-body">
            <span className="dash-kpi-label">IBM Handoff CTR</span>
            <strong className="dash-kpi-value">
              {summary?.overallHandoffCTR ? `${summary.overallHandoffCTR}%` : '0%'}
            </strong>
            <span className="dash-kpi-sub">
              {summary?.totalHandoffClicks ?? 0} total clicks on {summary?.storiesWithHandoff ?? 0} course links
            </span>
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div
        style={{
          display: 'flex',
          gap: 8,
          borderBottom: '1px solid var(--line, #e2e8f0)',
          margin: '20px 0',
          paddingBottom: 4,
        }}
      >
        <button
          onClick={() => setActiveTab('handoff')}
          style={{
            padding: '10px 18px',
            borderRadius: '10px 10px 0 0',
            fontWeight: 700,
            fontSize: 13,
            cursor: 'pointer',
            border: 'none',
            background: activeTab === 'handoff' ? 'var(--white, #fff)' : 'transparent',
            color: activeTab === 'handoff' ? '#6366f1' : 'var(--muted, #64748b)',
            borderBottom: activeTab === 'handoff' ? '3px solid #6366f1' : '3px solid transparent',
            display: 'flex',
            alignItems: 'center',
            gap: 7,
          }}
        >
          <ExternalLink size={15} />
          IBM Handoff Link CTR per Story
        </button>

        <button
          onClick={() => setActiveTab('reactions')}
          style={{
            padding: '10px 18px',
            borderRadius: '10px 10px 0 0',
            fontWeight: 700,
            fontSize: 13,
            cursor: 'pointer',
            border: 'none',
            background: activeTab === 'reactions' ? 'var(--white, #fff)' : 'transparent',
            color: activeTab === 'reactions' ? '#6366f1' : 'var(--muted, #64748b)',
            borderBottom: activeTab === 'reactions' ? '3px solid #6366f1' : '3px solid transparent',
            display: 'flex',
            alignItems: 'center',
            gap: 7,
          }}
        >
          <Smile size={15} />
          Story Reactions (Registered vs Guests)
        </button>
      </div>

      {/* Filter / Search Bar */}
      <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 16,
            marginBottom: 16,
            flexWrap: 'wrap',
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              background: 'var(--white, #fff)',
              padding: '6px 12px',
              borderRadius: 10,
              border: '1px solid var(--line, #e2e8f0)',
              width: 320,
            }}
          >
            <Search size={16} color="#94a3b8" />
            <input
              type="text"
              placeholder="Search by story or category..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{
                border: 'none',
                outline: 'none',
                background: 'transparent',
                width: '100%',
                fontSize: 13,
              }}
            />
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 12, color: 'var(--muted, #64748b)', fontWeight: 600 }}>Status:</span>
            {(['All', 'Published', 'Draft', 'Archived'] as const).map((s) => (
              <button
                key={s}
                onClick={() => setStatusFilter(s)}
                style={{
                  padding: '4px 10px',
                  borderRadius: 6,
                  fontSize: 12,
                  fontWeight: 600,
                  cursor: 'pointer',
                  border: 'none',
                  background: statusFilter === s ? '#6366f1' : '#f1f5f9',
                  color: statusFilter === s ? '#fff' : '#64748b',
                  transition: 'all .15s',
                }}
              >
                {s}
              </button>
            ))}
          </div>
        </div>

      {/* ── TAB 1: IBM HANDOFF LINK CTR PER STORY ────────────────────────────── */}
      {activeTab === 'handoff' && (
        <div className="dash-panel" style={{ padding: 0, overflow: 'hidden' }}>
          <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--line, #e2e8f0)', background: '#fafbfc' }}>
            <h3 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: 'var(--ink, #0f172a)' }}>
              IBM SkillsBuild Handoff Click-Through Rate per Story
            </h3>
            <p style={{ margin: '3px 0 0', fontSize: 12, color: 'var(--muted, #64748b)' }}>
              Calculates: (Total Users Who Clicked IBM Link &divide; Total Story Completers/Reactors) &times; 100%
            </p>
          </div>

          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: 13 }}>
              <thead>
                <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0', color: '#64748b', fontSize: 11, textTransform: 'uppercase', letterSpacing: '.05em' }}>
                  <th style={{ padding: '12px 20px', fontWeight: 700 }}>Story Details</th>
                  <th style={{ padding: '12px 14px', fontWeight: 700 }}>IBM Handoff Link</th>
                  <th style={{ padding: '12px 14px', fontWeight: 700, textAlign: 'center' }}>Total Story Completers</th>
                  <th style={{ padding: '12px 14px', fontWeight: 700, textAlign: 'center' }}>Registered Clicks</th>
                  <th style={{ padding: '12px 14px', fontWeight: 700, textAlign: 'center' }}>Guest Clicks</th>
                  <th style={{ padding: '12px 14px', fontWeight: 700, textAlign: 'center' }}>Total Clicks</th>
                  <th style={{ padding: '12px 20px', fontWeight: 700, textAlign: 'right' }}>Click-Through Rate (%)</th>
                </tr>
              </thead>
              <tbody>
                {paginatedStories.map((story) => {
                  const ctr = story.clickPercentage
                  const hasLink = story.hasHandoffLink

                  return (
                    <tr
                      key={story.id}
                      style={{
                        borderBottom: '1px solid #f1f5f9',
                        transition: 'background .15s',
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.background = '#f8fafc')}
                      onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                    >
                      {/* Story Info */}
                      <td style={{ padding: '14px 20px' }}>
                        <strong style={{ display: 'block', color: 'var(--ink, #0f172a)' }}>{story.title}</strong>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 4 }}>
                          <span style={{ fontSize: 11, color: '#64748b' }}>{story.category}</span>
                          <span style={{ fontSize: 9, padding: '1px 6px', borderRadius: 4, background: '#f1f5f9', color: '#475569', fontWeight: 600 }}>
                            {story.status}
                          </span>
                        </div>
                      </td>

                      {/* Handoff Link URL */}
                      <td style={{ padding: '14px 14px' }}>
                        {hasLink ? (
                          <a
                            href={story.skillsBuildUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: 4,
                              color: '#2563eb',
                              textDecoration: 'none',
                              fontSize: 12,
                              fontWeight: 500,
                              maxWidth: 220,
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap',
                            }}
                            title={story.skillsBuildUrl}
                          >
                            <ExternalLink size={12} />
                            {story.skillsBuildButtonText || 'IBM Course Link'}
                          </a>
                        ) : (
                          <span style={{ color: '#94a3b8', fontSize: 11, fontStyle: 'italic' }}>
                            No Link Configured
                          </span>
                        )}
                      </td>

                      {/* Total Completers / Audience */}
                      <td style={{ padding: '14px 14px', textAlign: 'center' }}>
                        <span style={{ fontWeight: 700, fontSize: 14, color: '#334155' }}>
                          {story.totalReactors}
                        </span>
                        <div style={{ fontSize: 10, color: '#94a3b8' }}>
                          {story.registeredReactors} reg &middot; {story.guestReactors} guest
                        </div>
                      </td>

                      {/* Registered Clicks */}
                      <td style={{ padding: '14px 14px', textAlign: 'center' }}>
                        <span style={{ fontWeight: 600, color: '#3b82f6' }}>{story.registeredClicks}</span>
                      </td>

                      {/* Guest Clicks */}
                      <td style={{ padding: '14px 14px', textAlign: 'center' }}>
                        <span style={{ fontWeight: 600, color: '#10b981' }}>{story.guestClicks}</span>
                      </td>

                      {/* Total Clicks */}
                      <td style={{ padding: '14px 14px', textAlign: 'center' }}>
                        <strong style={{ fontSize: 14, color: '#0f172a' }}>{story.totalClicks}</strong>
                      </td>

                      {/* CTR Percentage */}
                      <td style={{ padding: '14px 20px', textAlign: 'right' }}>
                        {!hasLink ? (
                          <span style={{ fontSize: 11, color: '#94a3b8', fontWeight: 500 }}>N/A</span>
                        ) : (
                          <div style={{ display: 'inline-flex', flexDirection: 'column', alignItems: 'flex-end', minWidth: 100 }}>
                            <span
                              style={{
                                fontWeight: 800,
                                fontSize: 14,
                                color: ctr >= 50 ? '#10b981' : ctr > 15 ? '#f59e0b' : '#64748b',
                              }}
                            >
                              {ctr}%
                            </span>
                            <div
                              style={{
                                width: 80,
                                height: 5,
                                background: '#e2e8f0',
                                borderRadius: 999,
                                marginTop: 4,
                                overflow: 'hidden',
                              }}
                            >
                              <div
                                style={{
                                  width: `${Math.min(ctr, 100)}%`,
                                  height: '100%',
                                  background: ctr >= 50 ? '#10b981' : ctr > 15 ? '#f59e0b' : '#6366f1',
                                  borderRadius: 999,
                                }}
                              />
                            </div>
                          </div>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          <PaginationBar
            currentPage={currentPage}
            totalItems={storiesByHandoff.length}
            itemsPerPage={METRICS_PER_PAGE}
            onPageChange={setCurrentPage}
          />
        </div>
      )}

      {/* ── TAB 2: STORY REACTIONS (REGISTERED VS GUESTS) ────────────────────── */}
      {activeTab === 'reactions' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div className="dash-panel" style={{ padding: 0, overflow: 'hidden' }}>
            <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--line, #e2e8f0)', background: '#fafbfc' }}>
              <h3 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: 'var(--ink, #0f172a)' }}>
                Story Reactions Breakdown (Registered &amp; Guests)
              </h3>
              <p style={{ margin: '3px 0 0', fontSize: 12, color: 'var(--muted, #64748b)' }}>
                Learner emotional check-ins saved per story from `public.story_reactions` and `public.story_reaction_guest_counts`
              </p>
            </div>

            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: 13 }}>
                <thead>
                  <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0', color: '#64748b', fontSize: 11, textTransform: 'uppercase', letterSpacing: '.05em' }}>
                    <th style={{ padding: '12px 20px', fontWeight: 700 }}>Story Title</th>
                    <th style={{ padding: '12px 14px', fontWeight: 700, textAlign: 'center' }}>Registered Learners</th>
                    <th style={{ padding: '12px 14px', fontWeight: 700, textAlign: 'center' }}>Guest Learners</th>
                    <th style={{ padding: '12px 14px', fontWeight: 700, textAlign: 'center' }}>Total Reactors</th>
                    <th style={{ padding: '12px 20px', fontWeight: 700 }}>Reaction Sentiment Breakdown</th>
                    <th style={{ padding: '12px 14px', fontWeight: 700, textAlign: 'center' }}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedStories.map((story) => {
                    const isExpanded = expandedStoryId === story.id
                    const activeReactions = Object.values(story.reactionsByType).filter((r) => r.total > 0)

                    return (
                      <Fragment key={story.id}>
                        <tr
                          style={{
                            borderBottom: '1px solid #f1f5f9',
                            background: isExpanded ? '#f8fafc' : 'transparent',
                            transition: 'background .15s',
                          }}
                        >
                          <td style={{ padding: '14px 20px' }}>
                            <strong style={{ display: 'block', color: 'var(--ink, #0f172a)' }}>{story.title}</strong>
                            <small style={{ color: '#64748b' }}>{story.category}</small>
                          </td>

                          {/* Registered count */}
                          <td style={{ padding: '14px 14px', textAlign: 'center' }}>
                            <span
                              style={{
                                display: 'inline-block',
                                padding: '2px 8px',
                                borderRadius: 6,
                                background: '#eff6ff',
                                color: '#2563eb',
                                fontWeight: 700,
                              }}
                            >
                              {story.registeredReactors}
                            </span>
                          </td>

                          {/* Guest count */}
                          <td style={{ padding: '14px 14px', textAlign: 'center' }}>
                            <span
                              style={{
                                display: 'inline-block',
                                padding: '2px 8px',
                                borderRadius: 6,
                                background: '#ecfdf5',
                                color: '#059669',
                                fontWeight: 700,
                              }}
                            >
                              {story.guestReactors}
                            </span>
                          </td>

                          {/* Total count */}
                          <td style={{ padding: '14px 14px', textAlign: 'center' }}>
                            <strong style={{ fontSize: 15, color: '#0f172a' }}>{story.totalReactors}</strong>
                          </td>

                          {/* Reaction Pills */}
                          <td style={{ padding: '14px 20px' }}>
                            {activeReactions.length === 0 ? (
                              <span style={{ fontSize: 11, color: '#94a3b8', fontStyle: 'italic' }}>
                                No reactions recorded yet
                              </span>
                            ) : (
                              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                                {activeReactions.map((r) => (
                                  <span
                                    key={r.reaction}
                                    style={{
                                      display: 'inline-flex',
                                      alignItems: 'center',
                                      gap: 4,
                                      padding: '2px 8px',
                                      borderRadius: 999,
                                      fontSize: 11,
                                      fontWeight: 600,
                                      background: (REACTION_COLORS[r.reaction] || '#64748b') + '18',
                                      color: REACTION_COLORS[r.reaction] || '#475569',
                                      border: `1px solid ${(REACTION_COLORS[r.reaction] || '#64748b')}30`,
                                    }}
                                  >
                                    <span>{REACTION_EMOJIS[r.reaction] || '•'}</span>
                                    <span>{r.label}:</span>
                                    <strong>{r.total}</strong>
                                    <small style={{ opacity: 0.7, fontSize: 9 }}>
                                      ({r.registered}r / {r.guests}g)
                                    </small>
                                  </span>
                                ))}
                              </div>
                            )}
                          </td>

                          {/* Expand Details */}
                          <td style={{ padding: '14px 14px', textAlign: 'center' }}>
                            <button
                              onClick={() => setExpandedStoryId(isExpanded ? null : story.id)}
                              style={{
                                background: isExpanded ? '#6366f1' : '#f1f5f9',
                                color: isExpanded ? '#fff' : '#475569',
                                border: 'none',
                                borderRadius: 6,
                                padding: '4px 8px',
                                fontSize: 11,
                                fontWeight: 600,
                                cursor: 'pointer',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: 4,
                              }}
                            >
                              {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                              {isExpanded ? 'Hide' : 'Details'}
                            </button>
                          </td>
                        </tr>

                        {/* Expanded details row */}
                        {isExpanded && (
                          <tr style={{ background: '#f8fafc', borderBottom: '2px solid #e2e8f0' }}>
                            <td colSpan={6} style={{ padding: '16px 24px' }}>
                              <h4 style={{ margin: '0 0 10px', fontSize: 13, fontWeight: 700, color: '#334155' }}>
                                Registered Learner Reactions for &ldquo;{story.title}&rdquo;
                              </h4>
                              {data?.registeredLearnerReactions.filter((r) => r.storyId === story.id).length === 0 ? (
                                <p style={{ fontSize: 12, color: '#94a3b8', margin: 0 }}>
                                  No registered learners have submitted check-ins for this story yet.
                                </p>
                              ) : (
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 10 }}>
                                  {data?.registeredLearnerReactions
                                    .filter((r) => r.storyId === story.id)
                                    .map((r, idx) => (
                                      <div
                                        key={idx}
                                        style={{
                                          padding: 10,
                                          borderRadius: 8,
                                          background: '#ffffff',
                                          border: '1px solid #e2e8f0',
                                          fontSize: 12,
                                        }}
                                      >
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                          <strong style={{ color: '#0f172a' }}>{r.learnerName}</strong>
                                          <span
                                            style={{
                                              padding: '2px 6px',
                                              borderRadius: 4,
                                              fontSize: 10,
                                              fontWeight: 700,
                                              background: (REACTION_COLORS[r.reaction] || '#64748b') + '20',
                                              color: REACTION_COLORS[r.reaction] || '#475569',
                                            }}
                                          >
                                            {REACTION_EMOJIS[r.reaction] || ''} {r.reaction}
                                          </span>
                                        </div>
                                        <div style={{ fontSize: 10, color: '#94a3b8', marginTop: 4 }}>
                                          {new Date(r.updatedAt || r.createdAt).toLocaleString()}
                                        </div>
                                      </div>
                                    ))}
                                </div>
                              )}
                            </td>
                          </tr>
                        )}
                      </Fragment>
                    )
                  })}
                </tbody>
              </table>
            </div>

            <PaginationBar
              currentPage={currentPage}
              totalItems={storiesByReactions.length}
              itemsPerPage={METRICS_PER_PAGE}
              onPageChange={setCurrentPage}
            />
          </div>
        </div>
      )}
    </div>
  )
}

