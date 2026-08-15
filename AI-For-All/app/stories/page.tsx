'use client'

import { useEffect, useRef, useState, type KeyboardEvent } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ArrowLeft, ArrowRight, Check } from 'lucide-react'
import { storyList } from '@/lib/stories'

const GUEST_STORY_KEY = 'ai-for-all:guest-story'

export default function StoriesPage() {
  const router = useRouter()
  const trackRef = useRef<HTMLDivElement>(null)
  const rafRef = useRef<number | null>(null)
  const settleRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [active, setActive] = useState(0)

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
  }, [])

  useEffect(() => {
    const saved = window.localStorage.getItem(GUEST_STORY_KEY)
    if (saved !== null) {
      const index = Number(saved)
      setActive(index)
      requestAnimationFrame(() => scrollToIndex(index, 'auto'))
    }
  }, [])

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
      choose(Math.min(active + 1, storyList.length - 1))
    }
    if (e.key === 'ArrowLeft') {
      e.preventDefault()
      choose(Math.max(active - 1, 0))
    }
  }

  // Only the centered card may be played — Play This Story routes into the
  // real Story Scene flow for that story's id.
  function playActive() {
    router.push(`/stories/${storyList[active].id}`)
  }

  return (
    <main className="stories-page">
      <Link href="/get-started" className="stories-back" aria-label="Go back">
        <ArrowLeft size={18} />
      </Link>

      <div className="stories-heading">
        <h2>Select Story</h2>
        <p>Select one that applies to you</p>
      </div>

      <div
        className="story-track"
        ref={trackRef}
        onScroll={handleScroll}
        onKeyDown={onKeyDown}
        role="listbox"
        aria-label="Stories"
        tabIndex={0}
      >
        {storyList.map((story, index) => (
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
            <img src={story.cardMascot} alt="" />
          </button>
        ))}
      </div>

      <p className="stories-selected">Selected: {storyList[active].title}</p>

      <button type="button" className="stories-cta" onClick={playActive}>
        Play this story
      </button>
    </main>
  )
}