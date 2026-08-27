'use client'

import { useState, useEffect, useMemo } from 'react'
import { Pencil, Archive, ArchiveRestore, Plus, Search, SlidersHorizontal, Users } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { StoryModule } from '@/lib/story-data'
import { fetchAllStories, saveStoryToDb } from '@/lib/supabase/stories'
import { getStoryPresenceCount, subscribeToStoryPresence } from '@/lib/supabase/presence'
import toast from 'react-hot-toast'

// Cycled swatch colors for stories that don't have a custom color set.
const SWATCHES = ['#8dcdf4', '#c8ccff', '#ff9d76', '#c7e94e', '#ff766e', '#79a8ff']

type StatusFilter = 'All' | 'Draft' | 'Published' | 'Archived'

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

      {hasLiveUsers && (
        <div 
          className="story-live-users" 
          title={`${activeLearners} live learner(s)`} 
          style={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: '4px', 
            color: '#10b981', 
            fontSize: '0.75rem', 
            marginLeft: 'auto',
            marginRight: '0.5rem',
            backgroundColor: 'rgba(16, 185, 129, 0.1)',
            padding: '2px 8px',
            borderRadius: '999px',
            fontWeight: '600'
          }}
        >
          <div style={{ width: 6, height: 6, borderRadius: '50%', backgroundColor: '#10b981', flexShrink: 0 }} />
          <Users size={12} />
          <span>{activeLearners} Live User{activeLearners !== 1 ? 's' : ''}</span>
        </div>
      )}

      <button
        className={`story-status-pill status-${story.status.toLowerCase()}`}
        onClick={() => handleCycleStatus(story)}
        disabled={isArchived || hasLiveUsers}
        title={isArchived ? 'Archived stories are read-only — restore to change status' : hasLiveUsers ? 'Cannot change status with live learners' : 'Click to toggle Draft/Published'}
        style={{ opacity: (isArchived || hasLiveUsers) ? 0.5 : 1, cursor: (isArchived || hasLiveUsers) ? 'not-allowed' : 'pointer' }}
      >
        {story.status}
      </button>

      <button 
        className="story-icon-btn" 
        onClick={() => handleEdit(story)} 
        title={hasLiveUsers ? 'Cannot edit with live learners' : 'Edit story'}
        disabled={hasLiveUsers}
        style={{ opacity: hasLiveUsers ? 0.5 : 1, cursor: hasLiveUsers ? 'not-allowed' : 'pointer' }}
      >
        <Pencil size={16} />
      </button>

      <button
        className="story-icon-btn"
        onClick={() => handleToggleArchive(story)}
        title={hasLiveUsers ? `Cannot ${isArchived ? 'restore' : 'archive'} with live learners` : (isArchived ? 'Restore story' : 'Archive story')}
        disabled={hasLiveUsers}
        style={{ opacity: hasLiveUsers ? 0.5 : 1, cursor: hasLiveUsers ? 'not-allowed' : 'pointer' }}
      >
        {isArchived ? <ArchiveRestore size={16} /> : <Archive size={16} />}
      </button>
    </div>
  )
}

export default function AdminStoriesPage() {
  const router = useRouter()
  const [stories, setStories] = useState<StoryModule[]>([])
  const [loading, setLoading] = useState(true)
  const [query, setQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('All')
  const [filterOpen, setFilterOpen] = useState(false)

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
    return stories.filter(s => {
      const matchesStatus = statusFilter === 'All' || s.status === statusFilter
      const matchesQuery = query.trim() === '' || s.title.toLowerCase().includes(query.trim().toLowerCase())
      return matchesStatus && matchesQuery
    })
  }, [stories, statusFilter, query])

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
      <div className="story-toolbar">
        <div className="story-search">
          <Search size={16} />
          <input
            placeholder="Search stories..."
            value={query}
            onChange={e => setQuery(e.target.value)}
          />
        </div>

        <div className="story-filter-wrap">
          <button
            className="story-filter-btn"
            onClick={() => setFilterOpen(o => !o)}
            title="Filter by status"
          >
            <SlidersHorizontal size={16} />
          </button>
          {filterOpen && (
            <div className="story-filter-menu">
              {(['All', 'Draft', 'Published', 'Archived'] as StatusFilter[]).map(opt => (
                <button
                  key={opt}
                  className={statusFilter === opt ? 'active' : ''}
                  onClick={() => { setStatusFilter(opt); setFilterOpen(false) }}
                >
                  {opt}
                </button>
              ))}
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
          <div className="story-empty">Loading stories…</div>
        ) : visibleStories.length === 0 ? (
          <div className="story-empty">
            {stories.length === 0
              ? <>No stories yet. Click <strong>New Story</strong> to create one!</>
              : 'No stories match your search or filter.'}
          </div>
        ) : (
          visibleStories.map((story, i) => (
            <StoryRowItem
              key={story.id}
              story={story}
              index={i}
              handleCycleStatus={handleCycleStatus}
              handleEdit={handleEdit}
              handleToggleArchive={handleToggleArchive}
            />
          ))
        )}
      </div>
    </section>
  )
}