'use client'

import { useEffect, useRef, useState, type KeyboardEvent } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ArrowLeft, ArrowRight, Check } from 'lucide-react'
import { fetchAllStories } from '@/lib/supabase/stories'
import { StoryModule } from '@/lib/story-data'
import { getMockSession } from '@/lib/mock-auth'

const GUEST_STORY_KEY = 'ai-for-all:guest-story'

// Per-story illustrations aren't stored in Supabase yet, so we cycle
// through these three local mascots by card position.
const FALLBACK_MASCOTS = [
  '/ai-for-all/Story-Page-Mascot-1.png',
  '/ai-for-all/Story-Page-Mascot-2.png',
  '/ai-for-all/Story-Page-Mascot-3.png',
]
const FALLBACK_COLORS = ['#6f8ce8', '#ff7a45', '#66cf9e', '#8dcdf4', '#c8ccff']

type StoryCard = {
  id: string
  title: string
  color: string
  bullets: string[]
  mascot: string
}

function toCard(story: StoryModule, index: number): StoryCard {
  // Use scene titles as the "what you'll do" bullets so the card stays
  // useful without needing a dedicated bullets column in the DB.
  const bullets = story.scenes
    .map((s) => s.title)
    .filter(Boolean)
    .slice(0, 3)

  return {
    id: story.id,
    title: story.title,
    color: story.color || FALLBACK_COLORS[index % FALLBACK_COLORS.length],
    bullets: bullets.length > 0 ? bullets : [story.description || story.category],
    mascot: FALLBACK_MASCOTS[index % FALLBACK_MASCOTS.length],
  }
}

export default function StoriesPage() {
  const router = useRouter()
  const trackRef = useRef<HTMLDivElement>(null)
  const rafRef = useRef<number | null>(null)
  const settleRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [active, setActive] = useState(0)
  const [cards, setCards] = useState<StoryCard[]>([])
  const [loading, setLoading] = useState(true)

  // Load published stories from Supabase.
  useEffect(() => {
    let cancelled = false
    ;(async () => {
      const all = await fetchAllStories()
      const published = all.filter((s) => s.status === 'Published')
      if (!cancelled) {
        setCards(published.map(toCard))
        setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    function updatePadding() {
      const track = trackRef.current
      const firstCard = track?.children[0] as HTMLElement | undefined
      if (!track || !firstCard) return
      const pad = Math.max(0, (track.clientWidth - firstCard.clientWidth) / 2)
      track.style.paddingLeft = `${pad}px`
      track.style.paddingRight = `${pad}px`
    }
    updatePadding()
    window.addEventListener('resize', updatePadding)
    return () => window.removeEventListener('resize', updatePadding)
  }, [cards])

  useEffect(() => {
    if (cards.length === 0) return
    const saved = window.localStorage.getItem(GUEST_STORY_KEY)
    if (saved !== null) {
      const index = Math.min(Number(saved), cards.length - 1)
      setActive(index)
      requestAnimationFrame(() => scrollToIndex(index, 'auto'))
    }
  }, [cards])

  function getNearestIndex(): number {
    const track = trackRef.current
    if (!track) return 0
    const center = track.scrollLeft + track.clientWidth / 2
    let closest = 0
    let closestDist = Infinity
    Array.from(track.children).forEach((child, i) => {
      const el = child as HTMLElement
      const elCenter = el.offsetLeft + el.clientWidth / 2
      const dist = Math.abs(elCenter - center)
      if (dist < closestDist) {
        closestDist = dist
        closest = i
      }
    })
    return closest
  }

  function scrollToIndex(index: number, behavior: ScrollBehavior = 'smooth') {
    const track = trackRef.current
    const card = track?.children[index] as HTMLElement | undefined
    if (!track || !card) return
    track.scrollTo({ left: card.offsetLeft - (track.clientWidth - card.clientWidth) / 2, behavior })
  }

  function handleScroll() {
    if (rafRef.current === null) {
      rafRef.current = requestAnimationFrame(() => {
        rafRef.current = null
        setActive(getNearestIndex())
      })
    }
    if (settleRef.current) clearTimeout(settleRef.current)
    settleRef.current = setTimeout(() => {
      const index = getNearestIndex()
      setActive(index)
      window.localStorage.setItem(GUEST_STORY_KEY, String(index))
    }, 140)
  }

  function choose(index: number) {
    scrollToIndex(index)
  }

  function onKeyDown(e: KeyboardEvent<HTMLDivElement>) {
    if (e.key === 'ArrowRight') {
      e.preventDefault()
      choose(Math.min(active + 1, cards.length - 1))
    }
    if (e.key === 'ArrowLeft') {
      e.preventDefault()
      choose(Math.max(active - 1, 0))
    }
  }

  // Only the centered card may be played — Play This Story routes into the
  // real Story Scene flow for that story's id.
  function playActive() {
    if (!cards[active]) return
    router.push(`/stories/${cards[active].id}`)
  }

  const session = typeof window !== 'undefined' ? getMockSession() : null
  const backHref = session ? '/home' : '/get-started'

  return (
    <main className="stories-page">
      <Link href={backHref} className="stories-back" aria-label="Go back">
        <ArrowLeft size={18} />
      </Link>

      <div className="stories-heading">
        <h2>Select Story</h2>
        <p>Select one that applies to you</p>
      </div>

      {loading ? (
        <p style={{ textAlign: 'center', color: 'var(--muted)', padding: '3rem 0' }}>Loading stories…</p>
      ) : cards.length === 0 ? (
        <p style={{ textAlign: 'center', color: 'var(--muted)', padding: '3rem 0' }}>
          No stories are published yet — check back soon!
        </p>
      ) : (
        <>
          <div
            className="story-track"
            ref={trackRef}
            onScroll={handleScroll}
            onKeyDown={onKeyDown}
            role="listbox"
            aria-label="Stories"
            tabIndex={0}
          >
            {cards.map((story, index) => (
              <button
                key={story.id}
                role="option"
                aria-selected={active === index}
                className="story-card"
                style={{ background: story.color }}
                onClick={() => choose(index)}
              >
                <div className="story-card-top">
                  <strong>{story.title}</strong>
                  <span className="story-card-arrow">
                    <ArrowRight size={15} />
                  </span>
                </div>
                <ul className="story-card-bullets">
                  {story.bullets.map((bullet) => (
                    <li key={bullet}>
                      <Check size={11} /> {bullet}
                    </li>
                  ))}
                </ul>
                <img src={story.mascot} alt="" />
              </button>
            ))}
          </div>

          <p className="stories-selected">Selected: {cards[active]?.title}</p>

          <button type="button" className="stories-cta" onClick={playActive}>
            Play this story
          </button>
        </>
      )}
    </main>
  )
}