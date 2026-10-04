'use client'

/**
 * components/story/story-reaction.tsx
 *
 * Story Reaction ("Check-in time") screen. Rendered by
 * app/stories/[storyId]/page.tsx as the 'reaction' step, right after the
 * learner finishes the last story step and before the Story Cleared screen.
 *
 * Registered learners: the selected reaction is saved through
 * POST /api/reactions (one row per user + story; reacting again updates it).
 * Guests: nothing is saved, matching how story progress is handled for
 * guests; they simply continue to the Story Cleared screen.
 */
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import toast from 'react-hot-toast'
import { StoryModule } from '@/lib/story-data'
import { STORY_REACTIONS, isStoryReactionValue, type StoryReactionValue } from '@/lib/reactions'
import { ReactionFace } from '@/components/story/reaction-faces'
import styles from './story-reaction.module.css'

interface StoryReactionProps {
  story: StoryModule
  isGuest: boolean
  /** Called after the reaction is saved; moves the story flow to 'cleared'. */
  onContinue: () => void
}

type Destination = 'continue' | 'stories'

export function StoryReaction({ story, isGuest, onContinue }: StoryReactionProps) {
  const router = useRouter()
  const [selected, setSelected] = useState<StoryReactionValue | null>(null)
  const [submitting, setSubmitting] = useState(false)

  // Pre-select the learner's previous reaction to this story, if any.
  useEffect(() => {
    if (isGuest) return
    let cancelled = false
    ;(async () => {
      try {
        const res = await fetch(`/api/reactions?storyId=${encodeURIComponent(story.id)}`)
        if (!res.ok) return
        const data = await res.json()
        if (!cancelled && isStoryReactionValue(data.reaction)) {
          setSelected((current) => current ?? data.reaction)
        }
      } catch {
        // Non-fatal: the learner can still pick a reaction
      }
    })()
    return () => {
      cancelled = true
    }
  }, [isGuest, story.id])

  /** Returns true when the reaction was saved (or there was nothing to save). */
  async function saveReaction(): Promise<boolean> {
    if (!selected || isGuest) return true
    try {
      const res = await fetch('/api/reactions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ storyId: story.id, reaction: selected }),
      })
      if (res.ok) return true
      if (res.status === 401) {
        toast.error('Your session has expired. Please sign in again to save your reaction.')
      } else {
        const data = await res.json().catch(() => ({}))
        toast.error(data.error ?? 'We couldn’t save your reaction. Please try again.')
      }
      return false
    } catch {
      toast.error('We couldn’t save your reaction. Please check your connection and try again.')
      return false
    }
  }

  async function handleSubmit(destination: Destination) {
    if (submitting) return // prevent double submits
    setSubmitting(true)
    const saved = await saveReaction()

    if (destination === 'stories') {
      // Secondary exit: never trap the learner here, even if saving failed.
      router.push('/stories')
      return
    }

    if (!saved) {
      setSubmitting(false) // let the learner retry
      return
    }
    if (selected && !isGuest) toast.success('Thanks for sharing!')
    onContinue()
  }

  return (
    <main className={styles.page}>
      <h2 className={styles.heading}>
        Check-in time:
        <br />
        How&apos;s the story so far?
      </h2>
      <p className={styles.subtitle}>Pick what fits best before we continue.</p>

      <div className={styles.grid} role="radiogroup" aria-label="How was the story?">
        {STORY_REACTIONS.map((reaction) => {
          const isSelected = selected === reaction.value
          return (
            <button
              key={reaction.value}
              type="button"
              role="radio"
              aria-checked={isSelected}
              className={`${styles.option}${isSelected ? ` ${styles.optionSelected}` : ''}`}
              onClick={() => setSelected(reaction.value)}
              disabled={submitting}
            >
              <span className={styles.face}>
                <ReactionFace value={reaction.value} />
              </span>
              <span className={styles.label}>{reaction.label}</span>
            </button>
          )
        })}
      </div>

      <button
        type="button"
        className={styles.continue}
        onClick={() => handleSubmit('continue')}
        disabled={!selected || submitting}
        aria-busy={submitting}
      >
        {submitting ? 'Saving…' : 'Continue'}
      </button>
      <button
        type="button"
        className={styles.another}
        onClick={() => handleSubmit('stories')}
        disabled={submitting}
      >
        Choose another story
      </button>
    </main>
  )
}