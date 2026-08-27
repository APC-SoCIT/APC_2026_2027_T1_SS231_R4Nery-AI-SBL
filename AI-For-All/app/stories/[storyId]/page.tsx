'use client'

import { useEffect, useState, type FormEvent } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  ArrowLeft,
  ArrowRight,
  Send,
  Sun,
  X,
  Zap,
  Smile,
  Sparkles,
  BookOpen,
  Meh,
  HelpCircle,
  Frown,
  Clock,
  CloudDrizzle,
  AlertTriangle,
  TrendingDown,
  Shuffle,
} from 'lucide-react'
import { fetchStoryById } from '@/lib/supabase/stories'
import { StoryModule } from '@/lib/story-data'
import { getMockSession } from '@/lib/mock-auth'

type Step = 'splash' | 'scene' | 'activity' | 'response' | 'reaction' | 'cleared' | 'not-found'

// Approximated from the reference screenshot — the mockup shows custom
// mood-character illustrations we don't have as assets, so these are
// generic lucide icons on colored circles standing in for them. Swap in
// the real icon/character assets once available.
const REACTIONS: { key: string; label: string; icon: typeof Zap; color: string }[] = [
  { key: 'hooked', label: 'Hooked', icon: Zap, color: '#ff8fa3' },
  { key: 'enjoying', label: 'Enjoying', icon: Smile, color: '#ff8fa3' },
  { key: 'curious', label: 'Curious', icon: Sparkles, color: '#b088f9' },
  { key: 'learning', label: 'Learning', icon: BookOpen, color: '#b088f9' },
  { key: 'neutral', label: 'Neutral', icon: Meh, color: '#9aa3c4' },
  { key: 'unsure', label: 'Unsure', icon: HelpCircle, color: '#6fb3f2' },
  { key: 'confused', label: 'Confused', icon: Frown, color: '#5fd6a0' },
  { key: 'slow', label: 'Slow', icon: Clock, color: '#3f8f6f' },
  { key: 'bored', label: 'Bored', icon: CloudDrizzle, color: '#ff9d5c' },
  { key: 'overwhelmed', label: 'Overwhelmed', icon: AlertTriangle, color: '#ff9d5c' },
  { key: 'losing-interest', label: 'Losing Interest', icon: TrendingDown, color: '#ffcf5c' },
  { key: 'try-another', label: 'Try Another', icon: Shuffle, color: '#ffcf5c' },
]

export default function StoryScenePage() {
  const params = useParams<{ storyId: string }>()
  const router = useRouter()

  const [story, setStory] = useState<StoryModule | null>(null)
  const [loading, setLoading] = useState(true)
  const [step, setStep] = useState<Step>('splash')
  const [sceneIndex, setSceneIndex] = useState(0)
  const [score, setScore] = useState(0)
  const [promptText, setPromptText] = useState('')
  const [reaction, setReaction] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      const found = await fetchStoryById(params.storyId)
      if (cancelled) return
      setStory(found)
      setLoading(false)
      if (!found) setStep('not-found')
    })()
    return () => {
      cancelled = true
    }
  }, [params.storyId])

  const session = getMockSession()
  const isGuest = !session

  if (loading) {
    return (
      <main className="story-scene-page">
        <p style={{ padding: 24, color: 'var(--muted)' }}>Loading story…</p>
      </main>
    )
  }

  if (!story || step === 'not-found') {
    return (
      <main className="story-scene-page">
        <p style={{ padding: 24 }}>We couldn&apos;t find that story.</p>
        <Link href="/stories" className="stories-cta" style={{ margin: 24 }}>
          Back to Select Story
        </Link>
      </main>
    )
  }

  const currentScene = story.scenes[sceneIndex]
  const activityPrompt = score >= 0 ? story.activity?.intellectPrompt : story.activity?.otherRoutePrompt

  // Guests never see the free-text prompting activity, regardless of the
  // story's type — they go straight from the last scene to the reaction
  // screen. Only registered learners on a "with_activity" story get the
  // activity + AI response steps.
  function choose(weight: number) {
    if (!story) return
    setScore((s) => s + weight)

    const isLastScene = sceneIndex >= story.scenes.length - 1
    if (!isLastScene) {
      setSceneIndex((i) => i + 1)
      return
    }

    if (story.type === 'with_activity' && !isGuest) {
      setStep('activity')
    } else {
      setStep('reaction')
    }
  }

  function submitActivity(e: FormEvent) {
    e.preventDefault()
    setStep('response')
  }

  if (step === 'splash') {
    return (
      <main className="story-splash-page">
        <div className="story-splash-topbar">
          <button
            type="button"
            className="story-splash-back"
            onClick={() => router.push('/stories')}
            aria-label="Back"
          >
            <ArrowLeft size={16} />
          </button>
          <button
            type="button"
            className="story-splash-close"
            onClick={() => router.push('/stories')}
            aria-label="Close"
          >
            <X size={20} />
          </button>
        </div>

        <h1 className="story-splash-title">{story.title}</h1>

        <div className="story-splash-mascot-area">
          <Sparkles className="story-splash-sparkle s1" size={14} aria-hidden="true" />
          <Sparkles className="story-splash-sparkle s2" size={10} aria-hidden="true" />
          <Sparkles className="story-splash-sparkle s3" size={12} aria-hidden="true" />
          <img src="/ai-for-all/Mascot-look-up.png" alt="" className="story-splash-mascot" />
        </div>

        <div className="story-splash-card">
          <p>{story.description || `A story about ${story.title.toLowerCase()}.`}</p>
          <button
            type="button"
            className="story-splash-cta"
            onClick={() => {
              setSceneIndex(0)
              setScore(0)
              setStep('scene')
            }}
          >
            Start Story
            <span className="launch-arrow">
              <ArrowRight size={16} />
            </span>
          </button>
        </div>
      </main>
    )
  }

  if (step === 'reaction') {
    return (
      <main className="story-reaction-page">
        <div className="story-reaction-heading">
          <p>Check-in time:</p>
          <h2>How&apos;s the story so far?</h2>
        </div>

        <div className="reaction-grid" role="radiogroup" aria-label="How is the story so far?">
          {REACTIONS.map(({ key, label, icon: Icon, color }) => (
            <button
              key={key}
              type="button"
              role="radio"
              aria-checked={reaction === key}
              className={`reaction-item${reaction === key ? ' is-selected' : ''}`}
              onClick={() => setReaction(key)}
            >
              <span className="reaction-circle" style={{ background: color }}>
                <Icon size={20} />
              </span>
              <small>{label}</small>
            </button>
          ))}
        </div>

        <button type="button" className="stories-cta" onClick={() => setStep('cleared')}>
          Continue
        </button>
        <Link href="/stories" className="reaction-choose-another">
          Choose another story
        </Link>
      </main>
    )
  }

  if (step === 'cleared') {
    return <StoryCleared story={story} isGuest={isGuest} />
  }

  return (
    <main className="story-scene-page">
      <div className="story-scene-header">
        <button type="button" onClick={() => router.push('/stories')} aria-label="Exit story">
          <ArrowLeft size={18} />
        </button>
        <strong>{story.title}</strong>
      </div>

      <div className="story-scene-avatar">
        <img src="/ai-for-all/Story-Ai-Mascot.png" alt="" className="story-scene-mascot" />
        {step === 'scene' && <span className="story-scene-dots">•••</span>}
      </div>

      {step === 'scene' && currentScene && (
        <>
          <div className="story-scene-bubble">{currentScene.body}</div>
          <div className="story-scene-choices">
            {(currentScene.choices || []).slice(0, 2).map((choice, i) => (
              <button
                key={choice.id}
                type="button"
                className="choice-button"
                onClick={() => choose(choice.weight)}
              >
                {i + 1}. {choice.label}
              </button>
            ))}
          </div>
        </>
      )}

      {step === 'activity' && (
        <form className="story-activity" onSubmit={submitActivity}>
          <div className="story-scene-bubble">{activityPrompt || 'Try to prompt'}</div>
          <div className="story-activity-row">
            <input
              className="story-activity-field"
              placeholder="Type your response..."
              value={promptText}
              onChange={(e) => setPromptText(e.target.value)}
            />
            <button type="submit" className="story-activity-send" aria-label="Send">
              <Send size={16} />
            </button>
          </div>
        </form>
      )}

      {step === 'response' && (
        <>
          <div className="story-scene-bubble">
            AI is like a little mind that watches, learns, and gets better each time you show it something new.
          </div>
          <div className="story-scene-bubble">
            Nice work — your answer showed real thinking about {story.category.toLowerCase()}.
          </div>
          <button type="button" className="stories-cta" onClick={() => setStep('reaction')}>
            Finish
          </button>
        </>
      )}
    </main>
  )
}

function StoryCleared({ story, isGuest }: { story: StoryModule; isGuest: boolean }) {
  return (
    <main className="story-cleared-page">
      <Sun size={64} className="story-cleared-icon" />
      <h1>STORY CLEARED</h1>

      {isGuest ? (
        <div className="story-cleared-card">
          <div className="story-cleared-row">
            <strong>Unlock more stories!</strong>
            <Link href="/sign-up" className="stories-cta">
              Sign Up
            </Link>
          </div>
          {story.skillsBuildUrl && (
            <div className="story-cleared-row">
              <strong>Want to learn more about AI?</strong>
              <a href={story.skillsBuildUrl} target="_blank" rel="noreferrer" className="secondary-button">
                {story.skillsBuildButtonText || 'IBM SkillsBuild'}
              </a>
            </div>
          )}
          <Link href="/" className="text-button story-cleared-backhome">
            Back Home
          </Link>
        </div>
      ) : (
        <div className="story-cleared-card">
          {story.skillsBuildUrl && (
            <div className="story-cleared-row">
              <strong>Want to learn more about AI?</strong>
              <a href={story.skillsBuildUrl} target="_blank" rel="noreferrer" className="secondary-button">
                {story.skillsBuildButtonText || 'IBM SkillsBuild Link'}
              </a>
            </div>
          )}
          <div className="story-cleared-row">
            <strong>Explore More Stories</strong>
            <Link href="/stories" className="stories-cta">
              Explore Stories
            </Link>
          </div>
          <Link href={`/stories/${story.id}`} className="text-button">
            Replay this story
          </Link>
          <Link href="/home" className="text-button story-cleared-backhome">
            Back Home
          </Link>
        </div>
      )}
    </main>
  )
}