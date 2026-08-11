'use client'

import { useState, useEffect } from 'react'
import { BookOpen, ChevronRight, Plus, Trash2, CheckCircle, Clock } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { StoryModule } from '@/lib/story-data'
import { fetchAllStories, deleteStoryFromDb, saveStoryToDb } from '@/lib/supabase/stories'

export default function AdminStoriesPage() {
  const router = useRouter()
  const [stories, setStories] = useState<StoryModule[]>([])
  const [loading, setLoading] = useState(true)

  const loadStories = async () => {
    setLoading(true)
    const list = await fetchAllStories()
    setStories(list)
    setLoading(false)
  }

  useEffect(() => {
    loadStories()
  }, [])

  const handleDelete = async (id: string, title: string) => {
    if (confirm(`Are you sure you want to delete "${title}"?`)) {
      await deleteStoryFromDb(id)
      setStories(stories.filter(s => s.id !== id))
    }
  }

  const handleToggleStatus = async (story: StoryModule) => {
    const newStatus = story.status === 'Published' ? 'Draft' : 'Published'
    const updated = { ...story, status: newStatus as 'Draft' | 'Published', updatedAt: 'Just now' }
    await saveStoryToDb(updated)
    setStories(stories.map(s => s.id === story.id ? updated : s))
  }

  return (
    <section className="admin-panel story-manager">
      <div className="panel-heading">
        <div>
          <h2>Story library ({stories.length})</h2>
          <p>Create, edit, and publish learning experiences stored in database.</p>
        </div>
        <button className="admin-primary small" style={{ width: 'auto' }} onClick={() => router.push('/admin/stories/create')}>
          <Plus size={16}/> New story
        </button>
      </div>

      {loading ? (
        <div style={{ padding: '2rem', textStyle: 'center', color: '#666' }}>
          Loading stories from database...
        </div>
      ) : stories.length === 0 ? (
        <div style={{ padding: '2rem', textAlign: 'center', color: '#666' }}>
          No stories found. Click <strong>New story</strong> to create one!
        </div>
      ) : (
        stories.map(story => (
          <div className="admin-story-row" key={story.id} style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '1rem', borderBottom: '1px solid #eee' }}>
            <div className="admin-story-icon" style={{ background: story.type === 'with_activity' ? '#fff0ef' : '#eaf2ff', color: story.type === 'with_activity' ? '#c92a20' : '#0755b9', padding: '0.75rem', borderRadius: '10px' }}>
              <BookOpen size={20}/>
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <strong style={{ fontSize: '1.05rem' }}>{story.title}</strong>
                <span style={{
                  fontSize: '0.72rem',
                  padding: '2px 8px',
                  borderRadius: '12px',
                  fontWeight: 700,
                  background: story.type === 'with_activity' ? '#ffe2df' : '#dbe8ff',
                  color: story.type === 'with_activity' ? '#90120a' : '#04387d'
                }}>
                  {story.type === 'with_activity' ? 'With Activity' : 'Choices Only'}
                </span>
              </div>
              <small style={{ color: '#666' }}>
                {story.category} · {story.level} · {story.scenes?.length || 0} Scenes · Updated {story.updatedAt || 'Recently'}
              </small>
            </div>

            <button
              onClick={() => handleToggleStatus(story)}
              style={{ background: 'none', border: 'none', cursor: 'pointer' }}
            >
              <span className={story.status === 'Published' ? 'status-live' : 'status-draft'}>
                {story.status === 'Published' ? <><CheckCircle size={12}/> Published</> : <><Clock size={12}/> Draft</>}
              </span>
            </button>

            <button
              onClick={() => router.push(`/admin/stories/${story.id}/edit`)}
              style={{ background: '#f0f4ff', border: '1px solid #dbe8ff', borderRadius: '6px', cursor: 'pointer', color: '#0755b9', padding: '0.4rem 0.8rem', fontWeight: 600, fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.3rem' }}
              title="Edit Story"
            >
              Edit
            </button>

            <button
              onClick={() => handleDelete(story.id, story.title)}
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#c92a20', padding: '0.4rem' }}
              title="Delete Story"
            >
              <Trash2 size={18}/>
            </button>
          </div>
        ))
      )}
    </section>
  )
}
