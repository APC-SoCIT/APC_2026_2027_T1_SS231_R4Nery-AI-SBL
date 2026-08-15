'use client'

import { useState, useEffect } from 'react'
import { ArrowLeft, ArrowRight, LockKeyhole, Sparkles } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { StoryModule } from '@/lib/story-data'
import { fetchAllStories } from '@/lib/supabase/stories'

export default function StoriesPage() {
  const router = useRouter()
  const [stories, setStories] = useState<StoryModule[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      setLoading(true)
      const list = await fetchAllStories()
      // Show published stories
      setStories(list.filter(s => s.status === 'Published' || !s.status))
      setLoading(false)
    }
    load()
  }, [])

  return (
    <section className="story-select page-section">
      <button className="back-button page-back" onClick={() => router.back()}><ArrowLeft size={18}/> Back</button>
      
      <div className="section-heading">
        <p className="kicker">STORIES</p>
        <h2>Select a story</h2>
        <p>Choose an interactive story to explore AI concepts.</p>
      </div>
      
      {loading ? (
        <div style={{ textAlign: 'center', padding: '3rem', color: '#666' }}>
          Loading story library...
        </div>
      ) : (
        <div className="story-carousel" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1.25rem' }}>
          {stories.map((item) => (
            <button 
              key={item.id} 
              className="story-tile" 
              style={{ background: item.color || '#79a8ff', borderRadius: '18px', padding: '1.5rem', textAlign: 'left', color: '#fff', border: 'none', cursor: 'pointer', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', minHeight: '180px', position: 'relative', overflow: 'hidden' }} 
              onClick={() => router.push(`/stories/${item.id}`)}
            >
              <div>
                <span style={{ fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '1px', opacity: 0.9, background: 'rgba(255,255,255,0.25)', padding: '2px 8px', borderRadius: '10px' }}>
                  {item.type === 'with_activity' ? 'With Activity' : 'Tap Choices'}
                </span>
                <strong style={{ display: 'block', fontSize: '1.25rem', marginTop: '0.5rem' }}>{item.title}</strong>
                <small style={{ display: 'block', opacity: 0.9, marginTop: '0.25rem', fontSize: '0.85rem' }}>{item.description || item.category}</small>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '1rem' }}>
                <span style={{ fontSize: '0.8rem', fontWeight: 700 }}>{item.scenes?.length || 3} Scenes</span>
                <ArrowRight size={20}/>
              </div>
            </button>
          ))}
        </div>
      )}
    </section>
  )
}
