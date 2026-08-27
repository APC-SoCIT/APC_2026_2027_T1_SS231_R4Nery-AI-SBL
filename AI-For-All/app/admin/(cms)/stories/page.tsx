'use client'

import { useState, useEffect, useMemo, useCallback } from 'react'
import { Pencil, Archive, ArchiveRestore, Plus, Search, SlidersHorizontal, Users } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { StoryModule } from '@/lib/story-data'
import { fetchAllStories, saveStoryToDb } from '@/lib/supabase/stories'
import { subscribeToStoryPresence } from '@/lib/supabase/presence'
import ConfirmModal from '@/components/ui/confirm-modal'
import toast from 'react-hot-toast'

// Cycled swatch colors for stories that don't have a custom color set.
const SWATCHES = ['#8dcdf4', '#c8ccff', '#ff9d76', '#c7e94e', '#ff766e', '#79a8ff']

type StatusFilter = 'All' | 'Draft' | 'Published' | 'Archived'

export default function AdminStoriesPage() {
  const router = useRouter()
  const [stories, setStories] = useState<StoryModule[]>([])
  const [loading, setLoading] = useState(true)
  const [query, setQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('All')
  const [filterOpen, setFilterOpen] = useState(false)

  // Confirmation modal state
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [confirmAction, setConfirmAction] = useState<(() => void) | null>(null)
  const [confirmTitle, setConfirmTitle] = useState('')
  const [confirmMessage, setConfirmMessage] = useState('')
  const [confirmVariant, setConfirmVariant] = useState<'danger' | 'default'>('default')
  const [confirmLabel, setConfirmLabel] = useState('Confirm')

  // Live-user presence counts per story ID
  const [liveUsers, setLiveUsers] = useState<Record<string, number>>({})

  const loadStories = async () => {
    setLoading(true)
    const list = await fetchAllStories()
    setStories(list)
    setLoading(false)
  }

  useEffect(() => {
    loadStories()
  }, [])

  // Subscribe to presence for each story
  useEffect(() => {
    if (stories.length === 0) return

    const unsubscribers: (() => void)[] = []

    stories.forEach((story) => {
      const unsub = subscribeToStoryPresence(story.id, (count) => {
        setLiveUsers((prev) => {
          if (prev[story.id] === count) return prev
          return { ...prev, [story.id]: count }
        })
      })
      unsubscribers.push(unsub)
    })

    return () => {
      unsubscribers.forEach((unsub) => unsub())
    }
  }, [stories])

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

  const showConfirm = useCallback((opts: {
    title: string
    message: string
    variant?: 'danger' | 'default'
    label?: string
    action: () => void
  }) => {
    setConfirmTitle(opts.title)
    setConfirmMessage(opts.message)
    setConfirmVariant(opts.variant || 'default')
    setConfirmLabel(opts.label || 'Confirm')
    setConfirmAction(() => opts.action)
    setConfirmOpen(true)
  }, [])

  const handleToggleArchive = async (story: StoryModule) => {
    const isArchiving = story.status !== 'Archived'
    const newStatus = isArchiving ? 'Archived' : 'Published'

    const doArchive = async () => {
      try {
        const updated = { ...story, status: newStatus as StoryModule['status'], updatedAt: 'Just now' }
        await saveStoryToDb(updated)
        setStories(stories.map(s => s.id === story.id ? updated : s))
        toast.success(newStatus === 'Archived' ? `"${story.title}" archived` : `"${story.title}" restored`)
      } catch {
        toast.error('Failed to update story')
      }
    }

    if (isArchiving) {
      showConfirm({
        title: 'Archive this story?',
        message: `"${story.title}" will be archived and hidden from learners. You can restore it later.`,
        variant: 'danger',
        label: 'Archive',
        action: doArchive,
      })
    } else {
      // Restoring doesn't need confirmation
      doArchive()
    }
  }

  const handleCycleStatus = async (story: StoryModule) => {
    if (story.status === 'Archived') return // use the archive button to restore
    const newStatus = story.status === 'Published' ? 'Draft' : 'Published'
    try {
      const updated = { ...story, status: newStatus as StoryModule['status'], updatedAt: 'Just now' }
      await saveStoryToDb(updated)
      setStories(stories.map(s => s.id === story.id ? updated : s))
      toast.success(`Story status changed to ${newStatus}`)
    } catch {
      toast.error('Failed to change story status')
    }
  }

  const handleEdit = (story: StoryModule) => {
    router.push(`/admin/stories/${story.id}/edit`)
  }

  const getStoryLiveCount = (storyId: string) => liveUsers[storyId] || 0

  return (
    <section className="story-manager-v2">
      {/* Confirmation Modal */}
      <ConfirmModal
        open={confirmOpen}
        title={confirmTitle}
        message={confirmMessage}
        variant={confirmVariant}
        confirmLabel={confirmLabel}
        onConfirm={() => {
          setConfirmOpen(false)
          confirmAction?.()
        }}
        onCancel={() => setConfirmOpen(false)}
      />

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
          visibleStories.map((story, i) => {
            const liveCount = getStoryLiveCount(story.id)
            const hasLiveUsers = liveCount > 0

            return (
              <div className="story-row-v2" key={story.id}>
                <span className="story-swatch" style={{ background: story.color || SWATCHES[i % SWATCHES.length] }} />

                <div className="story-row-info">
                  <strong>{story.title}</strong>
                  <small>{story.category} · {story.level} · {story.scenes?.length || 0} scenes</small>
                </div>

                {/* Live user badge */}
                {hasLiveUsers && (
                  <span className="story-live-badge" title={`${liveCount} user(s) currently playing`}>
                    <span className="story-live-dot" />
                    <Users size={12} /> {liveCount} live
                  </span>
                )}

                <button
                  className={`story-status-pill status-${story.status.toLowerCase()}`}
                  onClick={() => handleCycleStatus(story)}
                  disabled={story.status === 'Archived'}
                  title={story.status === 'Archived' ? 'Archived stories are read-only — restore to change status' : 'Click to toggle Draft/Published'}
                >
                  {story.status}
                </button>

                <button
                  className="story-icon-btn"
                  onClick={() => handleEdit(story)}
                  title={hasLiveUsers ? `Cannot edit — ${liveCount} user(s) currently playing` : 'Edit story'}
                  disabled={hasLiveUsers}
                >
                  <Pencil size={16} />
                </button>

                <button
                  className="story-icon-btn"
                  onClick={() => handleToggleArchive(story)}
                  title={
                    hasLiveUsers
                      ? `Cannot archive — ${liveCount} user(s) currently playing`
                      : story.status === 'Archived'
                        ? 'Restore story'
                        : 'Archive story'
                  }
                  disabled={hasLiveUsers && story.status !== 'Archived'}
                >
                  {story.status === 'Archived' ? <ArchiveRestore size={16} /> : <Archive size={16} />}
                </button>
              </div>
            )
          })
        )}
      </div>
    </section>
  )
}