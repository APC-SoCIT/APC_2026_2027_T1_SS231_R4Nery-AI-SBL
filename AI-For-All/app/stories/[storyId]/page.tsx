'use client'

import { useEffect, useState, useRef, type FormEvent } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Send, Sun } from 'lucide-react'
import { fetchStoryById } from '@/lib/supabase/stories'
import { StoryModule } from '@/lib/story-data'
import { getMockSession } from '@/lib/mock-auth'
import { trackStoryPresence } from '@/lib/supabase/presence'

type Step = 'splash' | 'scene' | 'gate' | 'activity' | 'response' | 'cleared' | 'not-found'

export default function StoryScenePage() {
  const params = useParams<{ storyId: string }>()
  const router = useRouter()

  const [story, setStory] = useState<StoryModule | null>(null)
  const [loading, setLoading] = useState(true)
  const [step, setStep] = useState<Step>('splash')
  const [sceneIndex, setSceneIndex] = useState(0)
  const [score, setScore] = useState(0)
  const [promptText, setPromptText] = useState('')
  const presenceCleanup = useRef<(() => void) | null>(null)

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

  // Track presence while the learner is on this story page
  useEffect(() => {
    if (!story || !params.storyId) return
    presenceCleanup.current = trackStoryPresence(params.storyId)
    return () => {
      presenceCleanup.current?.()
      presenceCleanup.current = null
    }
  }, [story, params.storyId])

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
  const gatedActivity = story.type === 'with_activity' && isGuest && story.allowFreeText !== false
  const activityPrompt = score >= 0
    ? story.activity?.intellectPrompt
    : story.activity?.otherRoutePrompt

  function choose(weight: number) {
    if (!story) return
    setScore((s) => s + weight)

    const isLastScene = sceneIndex >= story.scenes.length - 1
    if (!isLastScene) {
      setSceneIndex((i) => i + 1)
      return
    }

    // Last scene answered — decide what comes next.
    if (story.type === 'with_activity') {
      setStep(gatedActivity ? 'gate' : 'activity')
    } else {
      setStep('cleared')
    }
  }

  function submitActivity(e: FormEvent) {
    e.preventDefault()
    setStep('response')
  }

  if (step === 'splash') {
    return (
      <main className="story-splash-page">
        <img src="/ai-for-all/Story-Ai-Mascot.png" alt="" className="story-splash-mascot" />
        <div className="story-splash-card">
          <h2>{story.title}</h2>
          <p>{story.description || `A story about ${story.title.toLowerCase()}.`}</p>
          <button
            type="button"
            className="stories-cta"
            onClick={() => {
              setSceneIndex(0)
              setScore(0)
              setStep('scene')
            }}
          >
            Start Story
          </button>
        </div>
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
        <div className="ai-orb">●</div>
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

      {step === 'gate' && (
        <>
          <div className="story-scene-bubble">
            This story ends with a free-text activity for registered learners. Sign up to unlock it — or skip
            ahead for now.
          </div>
          <div className="story-scene-choices">
            <Link href="/sign-up" className="stories-cta" style={{ textAlign: 'center' }}>
              Sign Up
            </Link>
            <button type="button" className="choice-button" onClick={() => setStep('cleared')}>
              Skip for now
            </button>
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
          <button type="button" className="stories-cta" onClick={() => setStep('cleared')}>
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