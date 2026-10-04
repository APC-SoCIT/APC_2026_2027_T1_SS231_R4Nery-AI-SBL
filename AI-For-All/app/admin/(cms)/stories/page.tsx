'use client'

import { useState, useEffect, useMemo, useRef } from 'react'
import {
  Pencil, Archive, ArchiveRestore, Plus, Search, SlidersHorizontal,
  Users, Check, X, ArrowUpAZ, ChevronDown,
  ChevronsLeft, ChevronLeft, ChevronRight, ChevronsRight
} from 'lucide-react'
import { useRouter } from 'next/navigation'
import { StoryModule } from '@/lib/story-data'
import { fetchAllStories, saveStoryToDb } from '@/lib/supabase/stories'
import { getStoryPresenceCount, subscribeToStoryPresence } from '@/lib/supabase/presence'
import toast from 'react-hot-toast'

// Cycled swatch colors for stories that don't have a custom color set.
const SWATCHES = ['#8dcdf4', '#c8ccff', '#ff9d76', '#c7e94e', '#ff766e', '#79a8ff']
const STORIES_PER_PAGE = 10

type StatusFilter = 'All' | 'Draft' | 'Published' | 'Archived'
type SortKey = 'alpha-asc' | 'alpha-desc' | 'status' | 'level' | 'scenes' | 'updated'

function StoryRowItem({ 
  story, 
  index, 
  handleCycleStatus, 
  handleEdit, 
  handleToggleArchive 
}: { 
  story: StoryModule
  index: number
  handleCycleStatus: (story: StoryModule) => void
  handleEdit: (story: StoryModule) => void
  handleToggleArchive: (story: StoryModule) => void
}) {
  const [activeLearners, setActiveLearners] = useState(0)

  useEffect(() => {
    const unsubscribe = subscribeToStoryPresence(story.id, (count) => {
      setActiveLearners(count)
    })
    return () => unsubscribe()
  }, [story.id])

  const hasLiveUsers = activeLearners > 0
  const isArchived = story.status === 'Archived'

  return (
    <div className="story-row-v2" key={story.id}>
      <span className="story-swatch" style={{ background: story.color || SWATCHES[index % SWATCHES.length] }} />

      <div className="story-row-info">
        <strong>{story.title}</strong>
        <small>{story.category} &middot; {story.level} &middot; {story.scenes?.length || 0} scenes</small>
      </div>

      {/* Live user count — always visible */}
      <div
        className="story-live-users"
        title={hasLiveUsers ? `${activeLearners} live learner(s) on this story` : 'No active learners'}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '4px',
          color: hasLiveUsers ? '#10b981' : 'var(--muted, #888)',
          fontSize: '0.75rem',
          marginLeft: 'auto',
          marginRight: '0.5rem',
          backgroundColor: hasLiveUsers ? 'rgba(16, 185, 129, 0.1)' : 'rgba(128,128,128,0.08)',
          padding: '2px 8px',
          borderRadius: '999px',
          fontWeight: '600',
          transition: 'all 0.3s ease',
        }}
      >
        <div style={{
          width: 6,
          height: 6,
          borderRadius: '50%',
          backgroundColor: hasLiveUsers ? '#10b981' : '#aaa',
          flexShrink: 0,
          animation: hasLiveUsers ? 'livePulse 1.5s ease-in-out infinite' : 'none',
        }} />
        <Users size={12} />
        <span>{activeLearners} Live{activeLearners !== 1 ? '' : ''}</span>
      </div>

      <button
        className={`story-status-pill status-${story.status.toLowerCase()}`}
        onClick={() => handleCycleStatus(story)}
        disabled={isArchived || hasLiveUsers}
        title={isArchived ? 'Archived stories are read-only — restore to change status' : hasLiveUsers ? 'Cannot change status with live learners' : 'Click to toggle Draft/Published'}
        style={{ opacity: (isArchived || hasLiveUsers) ? 0.5 : 1, cursor: (isArchived || hasLiveUsers) ? 'not-allowed' : 'pointer' }}
      >
        {story.status}
      </button>

      {/* Edit and Archive buttons are hidden while there are live learners */}
      {!hasLiveUsers && (
        <>
          <button
            className="story-icon-btn"
            onClick={() => handleEdit(story)}
            title="Edit story"
          >
            <Pencil size={16} />
          </button>

          <button
            className="story-icon-btn"
            onClick={() => handleToggleArchive(story)}
            title={isArchived ? 'Restore story' : 'Archive story'}
          >
            {isArchived ? <ArchiveRestore size={16} /> : <Archive size={16} />}
          </button>
        </>
      )}
    </div>
  )
}

export default function AdminStoriesPage() {
  const router = useRouter()
  const [stories, setStories] = useState<StoryModule[]>([])
  const [loading, setLoading] = useState(true)
  const [query, setQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('All')
  const [sort, setSort] = useState<SortKey>('alpha-asc')
  const [filterOpen, setFilterOpen] = useState(false)
  const [page, setPage] = useState(1)
  const filterRef = useRef<HTMLDivElement>(null)

  // Close filter panel on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (filterRef.current && !filterRef.current.contains(e.target as Node)) setFilterOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const loadStories = async () => {
    setLoading(true)
    const list = await fetchAllStories()
    setStories(list)
    setLoading(false)
  }

  useEffect(() => {
    loadStories()
  }, [])

  const stats = useMemo(() => ({
    total: stories.length,
    draft: stories.filter(s => s.status === 'Draft').length,
    published: stories.filter(s => s.status === 'Published').length,
    archived: stories.filter(s => s.status === 'Archived').length,
  }), [stories])

  const visibleStories = useMemo(() => {
    let list = stories.filter(s => {
      const matchesStatus = statusFilter === 'All' || s.status === statusFilter
      const matchesQuery  = query.trim() === '' || s.title.toLowerCase().includes(query.trim().toLowerCase())
      return matchesStatus && matchesQuery
    })

    list = [...list].sort((a, b) => {
      switch (sort) {
        case 'alpha-asc':  return a.title.localeCompare(b.title)
        case 'alpha-desc': return b.title.localeCompare(a.title)
        case 'status':     return a.status.localeCompare(b.status)
        case 'level':      return a.level.localeCompare(b.level)
        case 'scenes':     return (b.scenes?.length ?? 0) - (a.scenes?.length ?? 0)
        case 'updated':    return (b.updatedAt ?? '').localeCompare(a.updatedAt ?? '')
        default:           return 0
      }
    })

    return list
  }, [stories, statusFilter, query, sort])

  // Reset to page 1 whenever filters change
  useMemo(() => setPage(1), [visibleStories])

  const totalPages = Math.max(1, Math.ceil(visibleStories.length / STORIES_PER_PAGE))
  const paginatedStories = useMemo(
    () => visibleStories.slice((page - 1) * STORIES_PER_PAGE, page * STORIES_PER_PAGE),
    [visibleStories, page]
  )

  const activeFilterCount = [
    sort !== 'alpha-asc',
    statusFilter !== 'All',
  ].filter(Boolean).length

  const resetFilters = () => { setSort('alpha-asc'); setStatusFilter('All') }

  const handleToggleArchive = async (story: StoryModule) => {
    const isArchiving = story.status !== 'Archived'

    const activeLearners = await getStoryPresenceCount(story.id)
    if (activeLearners > 0) {
      toast.error(`Cannot ${isArchiving ? 'archive' : 'restore'}: there are ${activeLearners} active learner(s) currently in this story.`)
      return
    }

    if (!window.confirm(`Are you sure you want to ${isArchiving ? 'archive' : 'restore'} "${story.title}"?`)) {
      return
    }

    const newStatus = isArchiving ? 'Archived' : 'Published'
    try {
      const updated = { ...story, status: newStatus as StoryModule['status'], updatedAt: 'Just now' }
      await saveStoryToDb(updated)
      setStories(stories.map(s => s.id === story.id ? updated : s))
      toast.success(newStatus === 'Archived' ? `"${story.title}" archived` : `"${story.title}" restored`)
    } catch {
      toast.error('Failed to update story')
    }
  }

  const handleCycleStatus = async (story: StoryModule) => {
    if (story.status === 'Archived') return // use the archive button to restore
    
    const activeLearners = await getStoryPresenceCount(story.id)
    if (activeLearners > 0) {
      toast.error(`Cannot change status: there are ${activeLearners} active learner(s) currently in this story.`)
      return
    }

    const newStatus = story.status === 'Published' ? 'Draft' : 'Published'

    if (!window.confirm(`Are you sure you want to change the status of "${story.title}" to ${newStatus}?`)) {
      return
    }

    try {
      const updated = { ...story, status: newStatus as StoryModule['status'], updatedAt: 'Just now' }
      await saveStoryToDb(updated)
      setStories(stories.map(s => s.id === story.id ? updated : s))
      toast.success(`Story status changed to ${newStatus}`)
    } catch {
      toast.error('Failed to change story status')
    }
  }

  const handleEdit = async (story: StoryModule) => {
    const activeLearners = await getStoryPresenceCount(story.id)
    if (activeLearners > 0) {
      toast.error(`Cannot edit: there are ${activeLearners} active learner(s) currently in this story.`)
      return
    }

    if (!window.confirm(`Are you sure you want to edit "${story.title}"?`)) {
      return
    }

    router.push(`/admin/stories/${story.id}/edit`)
  }

  return (
    <section className="story-manager-v2">
      {/* Stat cards */}
      <div className="story-stat-row">
        <div className="story-stat-card stat-total">
          <strong>{stats.total}</strong>
          <span>Total Stories</span>
        </div>
        <div className="story-stat-card stat-draft">
          <strong>{stats.draft}</strong>
          <span>Draft</span>
        </div>
        <div className="story-stat-card stat-published">
          <strong>{stats.published}</strong>
          <span>Published</span>
        </div>
        <div className="story-stat-card stat-archived">
          <strong>{stats.archived}</strong>
          <span>Archived</span>
        </div>
      </div>

      {/* Search + filter + new story */}
      <div className="story-toolbar" style={{ gap: 8 }}>
        <div className="story-search" style={{ flex: '1 1 0', minWidth: 0, maxWidth: 320 }}>
          <Search size={16} />
          <input
            placeholder="Search stories..."
            value={query}
            onChange={e => { setQuery(e.target.value); setPage(1) }}
          />
          {query && (
            <button className="st-search-clear" onClick={() => { setQuery(''); setPage(1) }}>
              <X size={13} />
            </button>
          )}
        </div>

        {/* Filter & Sort dropdown */}
        <div className="story-filter-wrap" ref={filterRef}>
          <button
            className={`st-filter-btn-v2${activeFilterCount > 0 ? ' st-filter-active' : ''}`}
            onClick={() => setFilterOpen(o => !o)}
          >
            <SlidersHorizontal size={15} />
            Filter &amp; Sort
            {activeFilterCount > 0 && <span className="st-filter-badge">{activeFilterCount}</span>}
            <ChevronDown size={13} style={{ marginLeft: 2, transition: 'transform .2s', transform: filterOpen ? 'rotate(180deg)' : 'none' }} />
          </button>

          {filterOpen && (
            <div className="st-filter-panel">
              {/* Sort */}
              <div className="st-filter-section">
                <label className="st-filter-label"><ArrowUpAZ size={13} /> Sort Stories</label>
                {([
                  ['alpha-asc',  'A → Z (Default)'],
                  ['alpha-desc', 'Z → A'],
                  ['status',     'By Status'],
                  ['level',      'By Level'],
                  ['scenes',     'Most Scenes'],
                  ['updated',    'Recently Updated'],
                ] as [SortKey, string][]).map(([val, label]) => (
                  <button key={val} className={`st-filter-opt${sort === val ? ' active' : ''}`} onClick={() => setSort(val)}>
                    {sort === val && <Check size={12} />}{label}
                  </button>
                ))}
              </div>
              <div className="st-filter-divider" />
              {/* Status */}
              <div className="st-filter-section">
                <label className="st-filter-label">Status</label>
                {(['All', 'Published', 'Draft', 'Archived'] as StatusFilter[]).map(v => (
                  <button key={v} className={`st-filter-opt${statusFilter === v ? ' active' : ''}`} onClick={() => { setStatusFilter(v); setPage(1) }}>
                    {statusFilter === v && <Check size={12} />}{v}
                  </button>
                ))}
              </div>
              {activeFilterCount > 0 && (
                <>
                  <div className="st-filter-divider" />
                  <button className="st-filter-reset" onClick={resetFilters}>
                    <X size={12} /> Reset filters
                  </button>
                </>
              )}
            </div>
          )}
        </div>

        <button className="admin-primary small" style={{ width: 'auto', marginLeft: 'auto' }} onClick={() => router.push('/admin/stories/create')}>
          <Plus size={16} /> New Story
        </button>
      </div>

      {/* Rows */}
      <div className="story-row-list">
        {loading ? (
          <>
            {[...Array(4)].map((_, i) => (
              <div key={i} className="st-skeleton" />
            ))}
          </>
        ) : visibleStories.length === 0 ? (
          <div className="story-empty">
            {stories.length === 0
              ? <>No stories yet. Click <strong>New Story</strong> to create one!</>
              : 'No stories match your search or filter.'}
          </div>
        ) : (
          paginatedStories.map((story, i) => (
            <StoryRowItem
              key={story.id}
              story={story}
              index={(page - 1) * STORIES_PER_PAGE + i}
              handleCycleStatus={handleCycleStatus}
              handleEdit={handleEdit}
              handleToggleArchive={handleToggleArchive}
            />
          ))
        )}
      </div>

      {/* Pagination */}
      {!loading && visibleStories.length > 0 && (
        <div className="st-pagination">
          <span className="st-pg-info">
            Showing {Math.min((page - 1) * STORIES_PER_PAGE + 1, visibleStories.length)}–{Math.min(page * STORIES_PER_PAGE, visibleStories.length)} of {visibleStories.length} stor{visibleStories.length !== 1 ? 'ies' : 'y'}
          </span>
          <div className="st-pg-controls">
            <button onClick={() => setPage(1)} disabled={page === 1} className="st-pg-btn" title="First page"><ChevronsLeft size={14} /></button>
            <button onClick={() => setPage(p => p - 1)} disabled={page === 1} className="st-pg-btn" title="Previous page"><ChevronLeft size={14} /></button>
            {Array.from({ length: totalPages }, (_, i) => i + 1)
              .filter(n => n === 1 || n === totalPages || Math.abs(n - page) <= 1)
              .reduce<(number | '…')[]>((acc, n, idx, arr) => {
                if (idx > 0 && n - (arr[idx - 1] as number) > 1) acc.push('…')
                acc.push(n)
                return acc
              }, [])
              .map((n, i) =>
                n === '…' ? (
                  <span key={`ellipsis-${i}`} className="st-pg-ellipsis">…</span>
                ) : (
                  <button
                    key={n}
                    onClick={() => setPage(n as number)}
                    className={`st-pg-btn st-pg-num${page === n ? ' active' : ''}`}
                  >
                    {n}
                  </button>
                )
              )}
            <button onClick={() => setPage(p => p + 1)} disabled={page === totalPages} className="st-pg-btn" title="Next page"><ChevronRight size={14} /></button>
            <button onClick={() => setPage(totalPages)} disabled={page === totalPages} className="st-pg-btn" title="Last page"><ChevronsRight size={14} /></button>
          </div>
        </div>
      )}

      <style>{`
        /* Search clear btn */
        .st-search-clear{background:transparent;border:none;cursor:pointer;color:var(--muted);display:flex;align-items:center;padding:0;margin-left:2px}
        .st-search-clear:hover{color:var(--ink)}

        /* Filter button upgrade */
        .st-filter-btn-v2{display:inline-flex;align-items:center;gap:6px;font-size:13px;font-weight:600;padding:0 14px;height:38px;white-space:nowrap;border-radius:10px;background:var(--white);border:1.5px solid var(--line);color:var(--muted);cursor:pointer;transition:all .15s;box-shadow:0 2px 8px rgba(38,48,105,.06)}
        .st-filter-btn-v2:hover{border-color:#818cf8;color:var(--ink)}
        .st-filter-active{border-color:#818cf8;background:#f0f1ff;color:var(--ink)}
        .st-filter-badge{display:grid;place-items:center;width:18px;height:18px;border-radius:50%;background:#818cf8;color:#fff;font-size:10px;font-weight:800}

        /* Filter panel */
        .st-filter-panel{position:absolute;right:0;top:calc(100% + 8px);width:200px;background:var(--white);border-radius:14px;box-shadow:0 12px 40px rgba(38,48,105,.14);border:1px solid var(--line);z-index:500;overflow:hidden;animation:stSlideUp .15s ease}
        @keyframes stSlideUp{from{transform:translateY(8px);opacity:0}to{transform:translateY(0);opacity:1}}
        .st-filter-section{padding:10px 8px 6px}
        .st-filter-label{display:flex;align-items:center;gap:5px;padding:4px 8px 6px;font-size:10px;font-weight:800;text-transform:uppercase;letter-spacing:.08em;color:var(--muted)}
        .st-filter-opt{display:flex;align-items:center;gap:7px;width:100%;padding:8px 10px;border-radius:8px;background:transparent;border:none;font-size:13px;color:var(--ink);cursor:pointer;text-align:left;transition:background .12s}
        .st-filter-opt:hover{background:#f0f1ff}
        .st-filter-opt.active{color:#5b5ee0;font-weight:700}
        .st-filter-divider{height:1px;background:var(--line);margin:0 8px}
        .st-filter-reset{display:flex;align-items:center;gap:6px;width:100%;padding:10px 14px;border:none;background:transparent;font-size:12px;color:#c25a53;cursor:pointer;transition:background .12s}
        .st-filter-reset:hover{background:#fff0ee}

        /* Skeleton loader */
        .st-skeleton{height:60px;border-radius:10px;background:linear-gradient(90deg,var(--lavender) 25%,#f5f6ff 50%,var(--lavender) 75%);background-size:200% 100%;animation:stShimmer 1.4s infinite;margin-bottom:2px}
        @keyframes stShimmer{0%{background-position:200% 0}100%{background-position:-200% 0}}

        /* Pagination */
        .st-pagination{display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:10px;margin-top:16px;padding-top:14px;border-top:1px solid var(--line)}
        .st-pg-info{font-size:12px;color:var(--muted)}
        .st-pg-controls{display:flex;align-items:center;gap:4px}
        .st-pg-btn{display:grid;place-items:center;min-width:32px;height:32px;border-radius:8px;border:1px solid var(--line);background:transparent;color:var(--muted);cursor:pointer;font-size:13px;transition:all .12s;padding:0 6px}
        .st-pg-btn:hover:not(:disabled){background:#eef0ff;border-color:#c8ccff;color:#5b5ee0}
        .st-pg-btn:disabled{opacity:.35;cursor:not-allowed}
        .st-pg-num{font-weight:600}
        .st-pg-num.active{background:#818cf8;border-color:#818cf8;color:#fff}
        .st-pg-ellipsis{font-size:13px;color:var(--muted);padding:0 4px;user-select:none}
      `}</style>
    </section>
  )
}