'use client'

/**
 * components/story/story-reaction.tsx
 *
 * Story Reaction ("Check-in time") screen. Rendered by
 * app/stories/[storyId]/page.tsx as the 'reaction' step, right after the
 * learner finishes the last story step and before the Story Cleared screen.
 *
 * Every reaction is sent to POST /api/reactions, so the totals include guests:
 *   - Registered learners: saved as their own row (one per user + story;
 *     reacting again updates it), so facilitators can see who reacted.
 *   - Guests: only added to an anonymous per-story tally. The browser remembers
 *     the guest's last pick (see GUEST_REACTION_KEY) so changing it moves the
 *     count instead of adding a second one.
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

const GUEST_REACTION_KEY = 'ai-for-all:guest-reaction:'

/** The reaction this browser last sent for a story as a guest (nothing is stored server-side). */
function readGuestReaction(storyId: string): StoryReactionValue | null {
  try {
    const value = localStorage.getItem(GUEST_REACTION_KEY + storyId)
    return isStoryReactionValue(value) ? value : null
  } catch {
    return null
  }
}

function writeGuestReaction(storyId: string, value: StoryReactionValue) {
  try {
    localStorage.setItem(GUEST_REACTION_KEY + storyId, value)
  } catch {
    // localStorage unavailable: a later change would count as a new reaction
  }
}

export function StoryReaction({ story, isGuest, onContinue }: StoryReactionProps) {
  const router = useRouter()
  const [selected, setSelected] = useState<StoryReactionValue | null>(null)
  const [submitting, setSubmitting] = useState(false)

  // Pre-select the learner's previous reaction to this story, if any.
  useEffect(() => {
    if (isGuest) {
      const previous = readGuestReaction(story.id)
      if (previous) setSelected((current) => current ?? previous)
      return
    }
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

  /**
   * 'saved': stored. 'skipped': not stored, but the learner may continue
   * (nothing selected, or the guest rate limit was hit). 'failed': let them retry.
   */
  async function saveReaction(): Promise<'saved' | 'skipped' | 'failed'> {
    if (!selected) return 'skipped'
    try {
      // Guests send their previous pick so the server moves the count instead of adding one
      const previousReaction = isGuest ? readGuestReaction(story.id) : null
      const res = await fetch('/api/reactions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ storyId: story.id, reaction: selected, previousReaction }),
      })
      if (res.ok) {
        if (isGuest) writeGuestReaction(story.id, selected)
        return 'saved'
      }
      if (res.status === 429) {
        // Guest rate limit: never trap a real learner on this screen
        const data = await res.json().catch(() => ({}))
        toast.error(data.error ?? 'Your reaction wasn’t saved, but you can keep going.')
        return 'skipped'
      }
      if (res.status === 401) {
        toast.error('Your session has expired. Please sign in again to save your reaction.')
      } else {
        const data = await res.json().catch(() => ({}))
        toast.error(data.error ?? 'We couldn’t save your reaction. Please try again.')
      }
      return 'failed'
    } catch {
      toast.error('We couldn’t save your reaction. Please check your connection and try again.')
      return 'failed'
    }
  }

  async function handleSubmit(destination: Destination) {
    if (submitting) return // prevent double submits
    setSubmitting(true)
    const result = await saveReaction()

    if (destination === 'stories') {
      // Secondary exit: never trap the learner here, even if saving failed.
      router.push('/stories')
      return
    }

    if (result === 'failed') {
      setSubmitting(false) // let the learner retry
      return
    }
    if (result === 'saved') toast.success('Thanks for sharing!')
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