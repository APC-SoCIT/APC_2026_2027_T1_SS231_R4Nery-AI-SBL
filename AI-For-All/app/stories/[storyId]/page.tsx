'use client'
import { useCallback, useEffect, useRef, useState, type FormEvent } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Send, Sun, Lock, BookOpen, Star, ChevronLeft, ChevronRight, X } from 'lucide-react'
import { fetchStoryById } from '@/lib/supabase/stories'
import { trackStoryPresence } from '@/lib/supabase/presence'
import { StoryModule } from '@/lib/story-data'
import { useSession } from '@/lib/sessionContext'
import { SignupPrompt } from '@/components/auth/signup-prompt'
import { StoryReaction } from '@/components/story/story-reaction'
import toast from 'react-hot-toast'

type Step = 'splash' | 'scene' | 'gate' | 'activity' | 'response' | 'reaction' | 'cleared' | 'not-found'

const PROGRESS_KEY_PREFIX = 'ai-for-all:story-progress:'
// localStorage key for a story completed by a guest that needs to be synced after sign-in
export const PENDING_STORY_KEY = 'ai-for-all:pending-story-completion'
// How long the three-dot typing indicator shows before narration/dialogue appears
const TYPING_DELAY_MS = 700

export default function StoryScenePage() {
  const params = useParams<{ storyId: string }>()
  const router = useRouter()
  const [story, setStory] = useState<StoryModule | null>(null)
  const [loading, setLoading] = useState(true)
  const [step, setStep] = useState<Step>('splash')
  const [sceneIndex, setSceneIndex] = useState(0)
  const [score, setScore] = useState(0)
  const [promptText, setPromptText] = useState('')
  const [aiResponse, setAiResponse] = useState<string | null>(null)
  const [isEvaluating, setIsEvaluating] = useState(false)
  // Weight of every choice made so far, so going back can undo the score
  const [history, setHistory] = useState<number[]>([])
  const presenceCleanup = useRef<(() => void) | null>(null)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      const found = await fetchStoryById(params.storyId)
      if (cancelled) return
      setStory(found)
      if (found) {
        // Resume in-progress reading instead of restarting on reload.
        const saved = typeof window !== 'undefined'
          ? sessionStorage.getItem(PROGRESS_KEY_PREFIX + params.storyId)
          : null
        if (saved) {
          try {
            const parsed = JSON.parse(saved)
            if (parsed && typeof parsed.sceneIndex === 'number') {
              setSceneIndex(parsed.sceneIndex)
              setScore(parsed.score ?? 0)
              setPromptText(parsed.promptText ?? '')
              setHistory(Array.isArray(parsed.history) ? parsed.history : [])
              setStep(parsed.step ?? 'scene')
            }
          } catch {
            // Ignore malformed saved progress
          }
        }
      }
      setLoading(false)
      if (!found) setStep('not-found')
    })()
    return () => {
      cancelled = true
    }
  }, [params.storyId])

  // Persist in-progress state so a reload resumes instead of restarting.
  useEffect(() => {
    if (typeof window === 'undefined' || !story) return
    const key = PROGRESS_KEY_PREFIX + story.id
    if (step === 'scene' || step === 'gate' || step === 'activity' || step === 'response') {
      sessionStorage.setItem(key, JSON.stringify({ step, sceneIndex, score, promptText, history }))
    } else if (step === 'reaction' || step === 'cleared') {
      // Story finished — clear saved progress so a future visit starts fresh.
      sessionStorage.removeItem(key)
    }
  }, [story, step, sceneIndex, score, promptText, history])

  // Track presence while the learner is on this story page
  useEffect(() => {
    if (!story || !params.storyId) return
    presenceCleanup.current = trackStoryPresence(params.storyId)
    return () => {
      presenceCleanup.current?.()
      presenceCleanup.current = null
    }
  }, [story, params.storyId])

  const { session } = useSession()
  // Guest = no session or a Supabase anonymous user. Registered accounts are created with
  // users.role = 'guest' by the signup trigger, so the role column can't be used here.
  const isGuest = !session || session.isGuest
  const [showSignupPrompt, setShowSignupPrompt] = useState(false)

  // Save progress to the database when a registered user completes a story.
  const saveProgress = useCallback(async (storyId: string) => {
    if (isGuest) return // guests have no account to save to
    try {
      const res = await fetch('/api/progress', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ storyId }),
      })
      // fetch() does not throw on 4xx/5xx, so check the response explicitly
      if (!res.ok) {
        const detail = await res.json().catch(() => ({}))
        console.error('Saving story completion failed:', res.status, detail?.error)
        toast.error("We couldn't save your progress for this story.")
      }
    } catch (err) {
      // Non-fatal — progress save failure should not interrupt the UX
      console.error('Saving story completion failed:', err)
      toast.error("We couldn't save your progress for this story.")
    }
  }, [isGuest])

  // When a guest reaches 'cleared', persist the storyId so it can be synced
  // to the database automatically once the guest signs in or creates an account.
  // When an authenticated user reaches 'cleared', save progress immediately.
  useEffect(() => {
    if (step === 'cleared') {
      if (isGuest && story) {
        // Store the pending completion so sign-in/sign-up pages can flush it.
        try {
          localStorage.setItem(PENDING_STORY_KEY, story.id)
          sessionStorage.setItem('story_cleared', 'true')
        } catch {
          // localStorage may be unavailable — non-fatal
        }
        setShowSignupPrompt(false) // cleared screen has its own inline CTA
      } else if (!isGuest && story) {
        saveProgress(story.id)
      }
    } else if (step === 'reaction' && !isGuest && story) {
      // Also save on the reaction step for authenticated users (belt-and-suspenders)
      saveProgress(story.id)
    }
  }, [step, isGuest, story, saveProgress])

  // Typing indicator: each new narration/dialogue is "revealed" after a short delay.
  // Until its key is revealed, the three dots show instead of the text.
  const [revealedKey, setRevealedKey] = useState<string | null>(null)
  const dialogueKey = `${step}:${sceneIndex}`
  useEffect(() => {
    if (step !== 'scene' && step !== 'gate' && step !== 'activity' && step !== 'response') return
    const timer = window.setTimeout(() => setRevealedKey(dialogueKey), TYPING_DELAY_MS)
    return () => window.clearTimeout(timer)
  }, [step, dialogueKey])
  const isTyping = revealedKey !== dialogueKey

  if (loading) {
    return (
      <main className="story-scene-page">
        <p style={{ padding: 24, color: 'var(--muted)' }}>Loading story…</p>
      </main>
    )
  }

  // Render the reaction check-in screen (outside the scene layout)
  if (step === 'reaction' && story) {
    return <StoryReaction story={story} isGuest={isGuest} onContinue={() => setStep('cleared')} />
  }

  // Render the cleared screen (outside the scene layout)
  if (step === 'cleared' && story) {
    return (
      <>
        <StoryCleared story={story} isGuest={isGuest} />
        <SignupPrompt open={showSignupPrompt} onDismiss={() => setShowSignupPrompt(false)} />
      </>
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
    setHistory((h) => [...h, weight])
    const isLastScene = sceneIndex >= story.scenes.length - 1
    if (!isLastScene) {
      setSceneIndex((i) => i + 1)
      return
    }
    // Last scene answered — decide what comes next.
    // Progress is saved in the useEffect that watches step === 'reaction'.
    if (story.type === 'with_activity') {
      setStep(gatedActivity ? 'gate' : 'activity')
    } else {
      setStep('reaction')
    }
  }

  // Step back one screen: previous scene, or the splash art from the first scene
  function goBack() {
    if (!story) return
    if (step === 'response') {
      setStep('activity')
      return
    }
    // Undo the most recent choice so the score matches the scene being revisited
    const undoLastChoice = () => {
      const last = history[history.length - 1] ?? 0
      setScore((s) => s - last)
      setHistory((h) => h.slice(0, -1))
    }
    if (step === 'gate' || step === 'activity') {
      undoLastChoice()
      setSceneIndex(story.scenes.length - 1)
      setStep('scene')
      return
    }
    if (sceneIndex > 0) {
      undoLastChoice()
      setSceneIndex((i) => i - 1)
      return
    }
    // First scene: back to the splash art and start fresh
    sessionStorage.removeItem(PROGRESS_KEY_PREFIX + story.id)
    setScore(0)
    setHistory([])
    setStep('splash')
  }

  async function submitActivity(e: FormEvent) {
    e.preventDefault()
    if (!promptText.trim() || !story) return
    setStep('response')
    setIsEvaluating(true)
    
    try {
      const res = await fetch('/api/evaluate-answer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          storyTitle: story.title,
          category: story.category,
          activityPrompt,
          userAnswer: promptText
        })
      })
      const data = await res.json()
      if (res.ok && data.feedback) {
        setAiResponse(data.feedback)
      } else {
        setAiResponse(null)
      }
    } catch (err) {
      console.error(err)
      setAiResponse(null)
    } finally {
      setIsEvaluating(false)
    }
  }

  if (step === 'splash') {
    return (
      <main className="story-splash-page">
        <div className="story-splash-hero">
          <Link href="/stories" className="story-splash-back" aria-label="Back to stories">
            <ChevronLeft size={20} />
          </Link>
          <h2 className="story-splash-title">{story.title}</h2>
          <span className="story-splash-spark story-splash-spark--1" aria-hidden="true">◆</span>
          <span className="story-splash-spark story-splash-spark--2" aria-hidden="true">●</span>
          <span className="story-splash-spark story-splash-spark--3" aria-hidden="true">●</span>
          <span className="story-splash-spark story-splash-spark--4" aria-hidden="true">◆</span>
          <img src="/ai-for-all/Mascot-look-down.png" alt="" className="story-splash-mascot" />
        </div>
        <div className="story-splash-card">
          <p>{story.description || `A story about ${story.title.toLowerCase()}.`}</p>
        </div>
        <button
          type="button"
          className="stories-cta story-splash-start"
          onClick={() => {
            setSceneIndex(0)
            setScore(0)
            setHistory([])
            setStep('scene')
          }}
        >
          Start Story
          <span className="story-splash-start-arrow" aria-hidden="true">
            <ChevronRight size={20} />
          </span>
        </button>
      </main>
    )
  }

  return (
    <main className="story-scene-page story-session-layout">
      <div className="story-scene-header">
        <button
          type="button"
          onClick={goBack}
          aria-label={step === 'scene' && sceneIndex === 0 ? 'Back to story intro' : 'Previous'}
        >
          <ArrowLeft size={18} />
        </button>
        <strong>{story.title}</strong>
        <button
          type="button"
          className="story-scene-exit"
          onClick={() => router.push('/stories')}
          aria-label="Exit story"
        >
          <X size={18} />
        </button>
      </div>
      <div className="story-scene-avatar">
        <img
          src="/ai-for-all/Story-Ai-Mascot.png"
          alt=""
          aria-hidden="true"
          style={{ width: 'clamp(150px, min(60vw, 32vh), 320px)', height: 'auto', margin: 'calc(clamp(150px, min(60vw, 32vh), 320px) * -0.157) 0 calc(clamp(150px, min(60vw, 32vh), 320px) * -0.171)', objectFit: 'contain', pointerEvents: 'none' }}
        />
        {isTyping && (
          <span className="story-scene-dots story-typing-indicator" role="status" aria-label="Typing">
            <i />
            <i />
            <i />
          </span>
        )}
      </div>
      {step === 'scene' && currentScene && !isTyping && (
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
                {choice.label}
              </button>
            ))}
          </div>
        </>
      )}
      {step === 'gate' && !isTyping && (
        <>
          <div className="story-scene-bubble">
            This story ends with a free-text activity for registered learners. Sign up to unlock it — or skip
            ahead for now.
          </div>
          <div className="story-scene-choices">
            <Link href="/sign-up" className="stories-cta" style={{ textAlign: 'center' }}>
              Sign Up
            </Link>
            <button type="button" className="choice-button" onClick={() => setStep('reaction')}>
              Skip for now
            </button>
          </div>
        </>
      )}
      {step === 'activity' && !isTyping && (
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
      {step === 'response' && !isTyping && (
        <>
          <div className="story-scene-bubble">
            AI is like a little mind that watches, learns, and gets better each time you show it something new.
          </div>
          <div className="story-scene-bubble">
            {isEvaluating ? 'Reading your answer...' : (aiResponse || `Nice work — your answer showed real thinking about ${story.category.toLowerCase()}.`)}
          </div>
          <button type="button" className="stories-cta" onClick={() => setStep('reaction')} disabled={isEvaluating}>
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
      {/* Sunburst rays */}
      <div className="story-cleared-sunburst" aria-hidden="true">
        {Array.from({ length: 16 }).map((_, i) => (
          <span key={i} className="story-cleared-ray" style={{ '--ray-index': i } as React.CSSProperties} />
        ))}
      </div>
      {/* Glowing sun hero */}
      <div className="story-cleared-sun-wrap" aria-hidden="true">
        <div className="story-cleared-sun-glow" />
        <div className="story-cleared-sun-core">
          <Sun size={56} strokeWidth={1.5} />
        </div>
        {/* Sparkles */}
        <span className="story-cleared-spark story-cleared-spark--1">✦</span>
        <span className="story-cleared-spark story-cleared-spark--2">✦</span>
        <span className="story-cleared-spark story-cleared-spark--3">·</span>
        <span className="story-cleared-spark story-cleared-spark--4">·</span>
      </div>
      <h1 className="story-cleared-title">Story Cleared!</h1>
      <div className="story-cleared-card">
        {isGuest ? (
          // ── Guest flow ────────────────────────────────────────────────────
          // The pending story ID is stored in localStorage (see PENDING_STORY_KEY)
          // before this screen renders, so that after the guest signs in or
          // creates an account the completion is synced automatically.
          <>
            {/* Row 1: Sign In CTA */}
            <div className="story-cleared-cta-row">
              <div className="story-cleared-cta-icon story-cleared-cta-icon--lock">
                <Lock size={20} />
              </div>
              <strong className="story-cleared-cta-label">Save your progress!</strong>
              <Link href="/sign-in" className="story-cleared-btn">
                Sign In
              </Link>
            </div>
            <div className="story-cleared-divider" />
            {/* Row 2: IBM SkillsBuild */}
            <div className="story-cleared-cta-row">
              <div className="story-cleared-cta-icon story-cleared-cta-icon--book">
                <BookOpen size={20} />
                <Star size={10} className="story-cleared-book-star" />
              </div>
              <strong className="story-cleared-cta-label">Want to learn more about AI?</strong>
              {story.skillsBuildUrl ? (
                <a href={story.skillsBuildUrl} target="_blank" rel="noreferrer" className="story-cleared-btn">
                  {story.skillsBuildButtonText || 'IBM SkillsBuild'}
                </a>
              ) : (
                <Link href="/stories" className="story-cleared-btn">
                  Explore Stories
                </Link>
              )}
            </div>
            <Link href="/" className="story-cleared-back">
              Back
            </Link>
          </>
        ) : (
          // ── Authenticated flow ────────────────────────────────────────────
          <>
            {/* Row 1: Complete another story */}
            <div className="story-cleared-cta-row">
              <div className="story-cleared-cta-icon story-cleared-cta-icon--lock">
                <BookOpen size={20} />
              </div>
              <strong className="story-cleared-cta-label">Keep the momentum going!</strong>
              <Link href="/stories" className="story-cleared-btn">
                Another Story
              </Link>
            </div>
            <div className="story-cleared-divider" />
            {/* Row 2: IBM SkillsBuild */}
            {story.skillsBuildUrl && (
              <>
                <div className="story-cleared-cta-row">
                  <div className="story-cleared-cta-icon story-cleared-cta-icon--book">
                    <BookOpen size={20} />
                    <Star size={10} className="story-cleared-book-star" />
                  </div>
                  <strong className="story-cleared-cta-label">Want to learn more about AI?</strong>
                  <a href={story.skillsBuildUrl} target="_blank" rel="noreferrer" className="story-cleared-btn">
                    {story.skillsBuildButtonText || 'IBM SkillsBuild'}
                  </a>
                </div>
                <div className="story-cleared-divider" />
              </>
            )}
            {/* Row 3: Return to Home Screen */}
            <div className="story-cleared-cta-row">
              <div className="story-cleared-cta-icon story-cleared-cta-icon--book">
                <Star size={20} />
              </div>
              <strong className="story-cleared-cta-label">You&apos;re doing great!</strong>
              <Link href="/home" className="story-cleared-btn">
                Home Screen
              </Link>
            </div>
          </>
        )}
      </div>
    </main>
  )
}