'use client'

/**
 * components/story/story-reaction.tsx
 *
 * Story Reaction ("Check-in time") screen. Rendered by
 * app/stories/[storyId]/page.tsx as the 'reaction' step, right after the
 * learner finishes the last story step and before the Story Cleared screen.
 *
 * Every learner's reaction is saved through POST /api/reactions (one row per
 * learner + story; reacting again updates it), so the counts include guests:
 *   - Registered users and Supabase anonymous guests: identified by their session.
 *   - Guests with no session at all: identified by a random guestId kept in
 *     localStorage (see getGuestId), so a returning guest updates their own row.
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

const GUEST_ID_KEY = 'ai-for-all:guest-id'

/** Stable random id for this browser, used only when there is no Supabase session. */
function getGuestId(): string | null {
  try {
    let id = localStorage.getItem(GUEST_ID_KEY)
    if (!id) {
      id = crypto.randomUUID()
      localStorage.setItem(GUEST_ID_KEY, id)
    }
    return id
  } catch {
    return null // localStorage or crypto unavailable; the server will reject the save
  }
}

export function StoryReaction({ story, isGuest, onContinue }: StoryReactionProps) {
  const router = useRouter()
  const [selected, setSelected] = useState<StoryReactionValue | null>(null)
  const [submitting, setSubmitting] = useState(false)

  // Pre-select the learner's previous reaction to this story, if any.
  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const guestId = isGuest ? getGuestId() : null
        const guestParam = guestId ? `&guestId=${encodeURIComponent(guestId)}` : ''
        const res = await fetch(`/api/reactions?storyId=${encodeURIComponent(story.id)}${guestParam}`)
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
      // guestId is ignored by the server whenever a session (registered or anonymous) exists
      const guestId = isGuest ? getGuestId() : null
      const res = await fetch('/api/reactions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ storyId: story.id, reaction: selected, guestId }),
      })
      if (res.ok) return 'saved'
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