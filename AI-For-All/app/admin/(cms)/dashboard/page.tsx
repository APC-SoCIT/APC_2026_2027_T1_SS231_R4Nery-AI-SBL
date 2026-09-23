'use client'

import { useEffect, useState, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import {
  BookOpen, Users, Globe, Zap, AlertTriangle,
  CheckCircle, Plus, ChevronRight, RefreshCw,
  TrendingUp, FileText, BarChart3, Activity
} from 'lucide-react'
import { fetchDashboardStats, DashboardStats } from '@/lib/supabase/analytics'
import { subscribeToStoryPresence } from '@/lib/supabase/presence'

// ── Live presence map: storyId → learner count ─────────────────────────────
type PresenceMap = Record<string, number>

function useAllStoryPresence(storyIds: string[]) {
  const [presenceMap, setPresenceMap] = useState<PresenceMap>({})
  const unsubsRef = useRef<(() => void)[]>([])
  const idsKey = storyIds.join(',')

  useEffect(() => {
    unsubsRef.current.forEach(fn => fn())
    unsubsRef.current = []

    if (storyIds.length === 0) return

    const map: PresenceMap = {}
    storyIds.forEach(id => { map[id] = 0 })
    setPresenceMap({ ...map })

    storyIds.forEach(id => {
      const unsub = subscribeToStoryPresence(id, (count) => {
        setPresenceMap(prev => ({ ...prev, [id]: count }))
      })
      unsubsRef.current.push(unsub)
    })

    return () => {
      unsubsRef.current.forEach(fn => fn())
      unsubsRef.current = []
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [idsKey])

  const totalLive = Object.values(presenceMap).reduce((a, b) => a + b, 0)
  return { presenceMap, totalLive }
}

// ── Mini bar chart ──────────────────────────────────────────────────────────
function MiniBarChart({ data }: {
  data: { label: string; value: number; color: string }[]
}) {
  const max = Math.max(...data.map(d => d.value), 1)
  return (
    <div className="dash-mini-bars">
      {data.map(({ label, value, color }) => (
        <div key={label} className="dash-mini-bar-row">
          <span className="dash-mini-bar-label">{label}</span>
          <div className="dash-mini-bar-track">
            <div
              className="dash-mini-bar-fill"
              style={{ width: `${(value / max) * 100}%`, background: color }}
            />
          </div>
          <span className="dash-mini-bar-count">{value}</span>
        </div>
      ))}
    </div>
  )
}

// ── KPI Card ────────────────────────────────────────────────────────────────
function KpiCard({
  icon: Icon, label, value, sub, accent, isLive,
}: {
  icon: React.ElementType
  label: string
  value: string | number
  sub?: string
  accent: string
  isLive?: boolean
}) {
  return (
    <div className="dash-kpi-card">
      <div className="dash-kpi-icon" style={{ background: accent + '22', color: accent }}>
        <Icon size={20} />
      </div>
      <div className="dash-kpi-body">
        <span className="dash-kpi-label">
          {label}
          {isLive && <span className="dash-live-badge">LIVE</span>}
        </span>
        <strong className="dash-kpi-value">{value}</strong>
        {sub && <span className="dash-kpi-sub">{sub}</span>}
      </div>
    </div>
  )
}

// ── Health row ──────────────────────────────────────────────────────────────
function HealthRow({ title, issue, severity }: { title: string; issue: string; severity: 'warn' | 'error' }) {
  return (
    <div className={`dash-health-row dash-health-${severity}`}>
      <div className="dash-health-icon">
        <AlertTriangle size={13} />
      </div>
      <div className="dash-health-info">
        <strong>{title}</strong>
        <span>{issue}</span>
      </div>
    </div>
  )
}

// ── Main dashboard page ─────────────────────────────────────────────────────
export default function AdminDashboardPage() {
  const router = useRouter()
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [lastRefreshed, setLastRefreshed] = useState<Date>(new Date())

  const load = useCallback(async () => {
    setLoading(true)
    const data = await fetchDashboardStats()
    setStats(data)
    setLastRefreshed(new Date())
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  const { presenceMap, totalLive } = useAllStoryPresence(stats?.publishedStoryIds ?? [])

  // Derived bar data
  const statusBars = stats ? [
    { label: 'Published', value: stats.publishedStories, color: '#4ade80' },
    { label: 'Draft', value: stats.draftStories, color: '#a78bfa' },
    { label: 'Archived', value: stats.archivedStories, color: '#94a3b8' },
  ] : []

  const levelBars = stats
    ? Object.entries(stats.breakdown.byLevel).map(([label, value]) => ({
      label,
      value,
      color: label === 'Starter' ? '#38bdf8' : label === 'Intermediate' ? '#f59e0b' : '#f87171',
    }))
    : []

  const typeBars = stats
    ? Object.entries(stats.breakdown.byType).map(([label, value]) => ({
      label,
      value,
      color: label === 'With Activity' ? '#fb923c' : '#818cf8',
    }))
    : []

  const healthIssues = stats?.contentHealth ?? []
  const healthErrors = healthIssues.filter(i => i.severity === 'error').length
  const healthWarns = healthIssues.filter(i => i.severity === 'warn').length

  // Published stories sorted by live count desc
  const liveStories = (stats?.recentStories ?? [])
    .filter(s => s.status === 'Published')
    .map(s => ({ ...s, live: presenceMap[s.id] ?? 0 }))
    .sort((a, b) => b.live - a.live)

  return (
    <div className="dash-root">

      {/* Page header */}
      <div className="dash-page-header">
        <div>
          <h1 className="dash-page-title">Dashboard</h1>
          <p className="dash-page-sub">
            {loading ? 'Loading analytics…' : `Last updated ${lastRefreshed.toLocaleTimeString()}`}
          </p>
        </div>
        <button className="dash-refresh-btn" onClick={load} disabled={loading}>
          <RefreshCw size={15} className={loading ? 'dash-spin' : ''} />
          Refresh
        </button>
      </div>

      {loading ? (
        <div className="dash-loading-grid">
          {[...Array(4)].map((_, i) => <div key={i} className="dash-skeleton" />)}
        </div>
      ) : (
        <>
          {/* KPI Row */}
          <div className="dash-kpi-row">
            <KpiCard
              icon={BookOpen}
              label="Total Stories"
              value={stats?.totalStories ?? 0}
              sub={`${stats?.publishedStories ?? 0} published`}
              accent="#818cf8"
            />
            <KpiCard
              icon={Globe}
              label="Published"
              value={stats?.publishedStories ?? 0}
              sub={`${stats?.draftStories ?? 0} in draft`}
              accent="#4ade80"
            />
            <KpiCard
              icon={Users}
              label="Registered Users"
              value={stats?.registeredUsers ?? 0}
              sub={`${stats?.totalUsers ?? 0} total incl. guests`}
              accent="#38bdf8"
            />
            <KpiCard
              icon={Activity}
              label="Live Right Now"
              value={totalLive}
              sub={totalLive === 1 ? '1 learner active' : `${totalLive} learners active`}
              accent="#f59e0b"
              isLive
            />
          </div>

          {/* Main grid row 1 */}
          <div className="dash-main-grid">

            {/* Story breakdown */}
            <div className="dash-panel">
              <div className="dash-panel-header">
                <div>
                  <h2 className="dash-panel-title"><BarChart3 size={16} /> Story Library</h2>
                  <p className="dash-panel-sub">Breakdown by status, level &amp; type</p>
                </div>
              </div>

              <div className="dash-breakdown-grid">
                <div className="dash-breakdown-section">
                  <h4 className="dash-breakdown-label">By Status</h4>
                  <MiniBarChart data={statusBars} />
                </div>
                <div className="dash-breakdown-section">
                  <h4 className="dash-breakdown-label">By Level</h4>
                  <MiniBarChart data={levelBars} />
                </div>
                <div className="dash-breakdown-section">
                  <h4 className="dash-breakdown-label">By Type</h4>
                  <MiniBarChart data={typeBars} />
                </div>
              </div>

              {(stats?.breakdown.byCategory.length ?? 0) > 0 && (
                <div style={{ marginTop: 20 }}>
                  <h4 className="dash-breakdown-label">Top Categories</h4>
                  <div className="dash-category-pills">
                    {stats?.breakdown.byCategory.map(c => (
                      <span key={c.name} className="dash-category-pill">
                        {c.name} <em>{c.count}</em>
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Quick actions */}
            <div className="dash-panel">
              <div className="dash-panel-header">
                <div>
                  <h2 className="dash-panel-title"><Zap size={16} /> Quick Actions</h2>
                  <p className="dash-panel-sub">Jump straight to common tasks</p>
                </div>
              </div>

              <button className="quick-action" onClick={() => router.push('/admin/stories/create')}>
                <span style={{ background: 'var(--lime)', display: 'grid', placeItems: 'center', width: 35, height: 35, borderRadius: 9 }}><Plus size={18} /></span>
                <div><strong>Create a story</strong><small>Build a new AI learning path</small></div>
                <ChevronRight size={18} />
              </button>

              <button className="quick-action" onClick={() => router.push('/admin/stories')}>
                <span style={{ background: '#c8ccff', display: 'grid', placeItems: 'center', width: 35, height: 35, borderRadius: 9 }}><BookOpen size={18} /></span>
                <div><strong>Manage stories</strong><small>Edit, archive or publish content</small></div>
                <ChevronRight size={18} />
              </button>

              <button className="quick-action" onClick={() => router.push('/admin/learners')}>
                <span style={{ background: '#8dcdf4', display: 'grid', placeItems: 'center', width: 35, height: 35, borderRadius: 9 }}><Users size={18} /></span>
                <div><strong>View learners</strong><small>See progress and milestones</small></div>
                <ChevronRight size={18} />
              </button>

              <div className="dash-summary-strip">
                <div className="dash-summary-item">
                  <strong>{stats?.publishedStories ?? 0}</strong>
                  <span>Live stories</span>
                </div>
                <div className="dash-summary-divider" />
                <div className="dash-summary-item">
                  <strong>{stats?.draftStories ?? 0}</strong>
                  <span>In draft</span>
                </div>
                <div className="dash-summary-divider" />
                <div className="dash-summary-item">
                  <strong>{stats?.archivedStories ?? 0}</strong>
                  <span>Archived</span>
                </div>
              </div>
            </div>
          </div>

          {/* Main grid row 2 */}
          <div className="dash-main-grid" style={{ marginTop: 16 }}>

            {/* Live presence table */}
            <div className="dash-panel">
              <div className="dash-panel-header">
                <div>
                  <h2 className="dash-panel-title">
                    <Activity size={16} /> Live Story Activity
                    {totalLive > 0 && (
                      <span className="dash-live-badge" style={{ marginLeft: 8 }}>{totalLive} LIVE</span>
                    )}
                  </h2>
                  <p className="dash-panel-sub">Real-time learners per published story</p>
                </div>
              </div>

              {liveStories.length === 0 ? (
                <div className="dash-empty-state">
                  <Globe size={28} />
                  <p>No published stories yet</p>
                </div>
              ) : (
                <div className="dash-presence-table">
                  <div className="dash-presence-header">
                    <span>Story</span>
                    <span>Status</span>
                    <span>Live</span>
                  </div>
                  {liveStories.map(s => (
                    <div key={s.id} className={`dash-presence-row${s.live > 0 ? ' dash-presence-row--active' : ''}`}>
                      <span className="dash-presence-title">{s.title}</span>
                      <span className={`dash-status-chip status-${s.status.toLowerCase()}`}>{s.status}</span>
                      <span className="dash-presence-count">
                        {s.live > 0 ? (
                          <><span className="dash-presence-pulse" /><strong style={{ color: '#10b981' }}>{s.live}</strong></>
                        ) : (
                          <span style={{ color: 'var(--muted)', fontSize: 12 }}>—</span>
                        )}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Content health */}
            <div className="dash-panel">
              <div className="dash-panel-header">
                <div>
                  <h2 className="dash-panel-title"><TrendingUp size={16} /> Content Health</h2>
                  <p className="dash-panel-sub">Stories that need attention</p>
                </div>
                {healthIssues.length > 0 && (
                  <div style={{ display: 'flex', gap: 6 }}>
                    {healthErrors > 0 && (
                      <span className="dash-health-badge dash-health-badge--error">{healthErrors} error{healthErrors !== 1 ? 's' : ''}</span>
                    )}
                    {healthWarns > 0 && (
                      <span className="dash-health-badge dash-health-badge--warn">{healthWarns} warning{healthWarns !== 1 ? 's' : ''}</span>
                    )}
                  </div>
                )}
              </div>

              {healthIssues.length === 0 ? (
                <div className="dash-health-all-good">
                  <CheckCircle size={28} color="#4ade80" />
                  <strong>All stories look healthy!</strong>
                  <p>No missing descriptions, broken scenes, or incomplete activities.</p>
                </div>
              ) : (
                <div className="dash-health-list">
                  {healthIssues.slice(0, 8).map((item, i) => (
                    <HealthRow key={i} title={item.title} issue={item.issue} severity={item.severity} />
                  ))}
                  {healthIssues.length > 8 && (
                    <button className="dash-see-more" onClick={() => router.push('/admin/stories')}>
                      View all in Story Manager →
                    </button>
                  )}
                </div>
              )}

              {/* Recently updated */}
              {(stats?.recentStories.length ?? 0) > 0 && (
                <div style={{ marginTop: 20, borderTop: '1px solid var(--line)', paddingTop: 16 }}>
                  <h4 className="dash-breakdown-label">
                    <FileText size={12} style={{ verticalAlign: 'middle', marginRight: 4 }} />
                    Recently Updated
                  </h4>
                  {stats?.recentStories.slice(0, 4).map(s => (
                    <div key={s.id} className="dash-recent-row">
                      <span className={`dash-recent-dot dash-recent-dot--${s.status.toLowerCase()}`} />
                      <span className="dash-recent-title">{s.title}</span>
                      <span className="dash-recent-date">{s.updatedAt}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  )
}
