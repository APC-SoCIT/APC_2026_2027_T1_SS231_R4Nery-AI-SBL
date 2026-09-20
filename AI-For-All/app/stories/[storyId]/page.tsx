// Path: app/stories/[storyId]/page.tsx
'use client'

import { useEffect, useRef, useState, type CSSProperties, type FormEvent } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, ArrowRight, Send, Sun, Lock, BookOpen, Star, X } from 'lucide-react'
import { fetchStoryById } from '@/lib/supabase/stories'
import { trackStoryPresence } from '@/lib/supabase/presence'
import { StoryModule, type StoryChoice } from '@/lib/story-data'
import { useSession } from '@/lib/sessionContext'
import { SignupPrompt } from '@/components/auth/signup-prompt'
import { StoryAiFace } from '@/components/story/story-ai-face'

type Step = 'splash' | 'scene' | 'gate' | 'activity' | 'response' | 'cleared' | 'not-found'

type TranscriptMessage = {
  id: string
  role: 'ai' | 'user'
  text: string
}

const TYPEWRITER_DELAY = 18
const SCENE_TRANSITION_DELAY = 320

export default function StoryScenePage() {
  const params = useParams<{ storyId: string }>()
  const router = useRouter()
  const [story, setStory] = useState<StoryModule | null>(null)
  const [loading, setLoading] = useState(true)
  const [step, setStep] = useState<Step>('splash')
  const [sceneIndex, setSceneIndex] = useState(0)
  const [score, setScore] = useState(0)
  const [promptText, setPromptText] = useState('')
  const [messages, setMessages] = useState<TranscriptMessage[]>([])
  const [typedText, setTypedText] = useState('')
  const [isTyping, setIsTyping] = useState(false)
  const [choicesVisible, setChoicesVisible] = useState(false)
  const presenceCleanup = useRef<(() => void) | null>(null)
  const typingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const transitionTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const transcriptRef = useRef<HTMLDivElement>(null)

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

  // Track presence while the learner is on this story page.
  useEffect(() => {
    if (!story || !params.storyId) return
    presenceCleanup.current = trackStoryPresence(params.storyId)
    return () => {
      presenceCleanup.current?.()
      presenceCleanup.current = null
    }
  }, [story, params.storyId])

  const { session } = useSession()
  const isGuest = !session || session.role === 'guest'
  const [showSignupPrompt, setShowSignupPrompt] = useState(false)

  // Auto-open the sign-up prompt when a guest clears the story (P1.6).
  useEffect(() => {
    if (step === 'cleared' && isGuest) {
      setShowSignupPrompt(true)
    }
  }, [step, isGuest])

  const currentScene = story?.scenes[sceneIndex]

  // Type each AI narration before the current scene choices become available.
  // The finished narration is then committed to the transcript so the chat
  // history persists naturally across every scene.
  useEffect(() => {
    if (step !== 'scene' || !currentScene) return

    if (typingTimerRef.current) clearTimeout(typingTimerRef.current)

    const messageId = `ai-${currentScene.id}`
    setTypedText('')
    setChoicesVisible(false)
    setIsTyping(true)

    const commitMessage = () => {
      setMessages((previous) => {
        if (previous.some((message) => message.id === messageId)) return previous
        return [...previous, { id: messageId, role: 'ai', text: currentScene.body }]
      })
      setTypedText('')
      setIsTyping(false)
      setChoicesVisible(true)
    }

    const reduceMotion =
      typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches

    if (reduceMotion) {
      commitMessage()
      return
    }

    let characterIndex = 0
    const typeNextCharacter = () => {
      characterIndex += 1
      setTypedText(currentScene.body.slice(0, characterIndex))

      if (characterIndex >= currentScene.body.length) {
        typingTimerRef.current = setTimeout(commitMessage, 140)
        return
      }

      typingTimerRef.current = setTimeout(typeNextCharacter, TYPEWRITER_DELAY)
    }

    typingTimerRef.current = setTimeout(typeNextCharacter, 180)

    return () => {
      if (typingTimerRef.current) {
        clearTimeout(typingTimerRef.current)
        typingTimerRef.current = null
      }
    }
  }, [step, sceneIndex, currentScene?.id, currentScene?.body])

  useEffect(() => {
    const element = transcriptRef.current
    if (!element) return
    element.scrollTo({ top: element.scrollHeight, behavior: 'smooth' })
  }, [messages, typedText, step])

  useEffect(() => {
    return () => {
      if (typingTimerRef.current) clearTimeout(typingTimerRef.current)
      if (transitionTimerRef.current) clearTimeout(transitionTimerRef.current)
    }
  }, [])

  if (loading) {
    return (
      <main className="story-scene-page story-state-page">
        <p>Loading story…</p>
      </main>
    )
  }

  // Render the cleared screen outside the scene layout.
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
      <main className="story-scene-page story-state-page">
        <p>We couldn&apos;t find that story.</p>
        <Link href="/stories" className="stories-cta">
          Back to Select Story
        </Link>
      </main>
    )
  }

  const gatedActivity = story.type === 'with_activity' && isGuest && story.allowFreeText !== false
  const activityPrompt = score >= 0
    ? story.activity?.intellectPrompt
    : story.activity?.otherRoutePrompt

  function choose(choice: StoryChoice, optionIndex: number) {
    if (!story || !choicesVisible) return

    setChoicesVisible(false)
    setScore((currentScore) => currentScore + choice.weight)
    setMessages((previous) => [
      ...previous,
      {
        id: `user-${currentScene?.id ?? sceneIndex}-${choice.id}-${Date.now()}`,
        role: 'user',
        text: `${optionIndex + 1}. ${choice.label}`,
      },
    ])

    const isLastScene = sceneIndex >= story.scenes.length - 1
    transitionTimerRef.current = setTimeout(() => {
      if (!isLastScene) {
        setSceneIndex((index) => index + 1)
        return
      }

      if (story.type === 'with_activity') {
        setStep(gatedActivity ? 'gate' : 'activity')
      } else {
        setStep('cleared')
      }
    }, SCENE_TRANSITION_DELAY)
  }

  function submitActivity(e: FormEvent) {
    e.preventDefault()
    const trimmedPrompt = promptText.trim()
    if (!trimmedPrompt) return

    setMessages((previous) => [
      ...previous,
      { id: `activity-user-${Date.now()}`, role: 'user', text: trimmedPrompt },
    ])
    setStep('response')
  }

  function startStory() {
    if (typingTimerRef.current) clearTimeout(typingTimerRef.current)
    if (transitionTimerRef.current) clearTimeout(transitionTimerRef.current)
    setMessages([])
    setTypedText('')
    setChoicesVisible(false)
    setSceneIndex(0)
    setScore(0)
    setPromptText('')
    setStep('scene')
  }

  if (step === 'splash') {
    return (
      <main className="story-splash-page">
        <button
          type="button"
          className="story-splash-close"
          onClick={() => router.push('/stories')}
          aria-label="Close story"
        >
          <X size={14} strokeWidth={3} />
        </button>

        <h1 className="story-splash-title">Study with AI</h1>

        <div className="story-splash-hero" aria-hidden="true">
          <span className="story-splash-spark story-splash-spark-one">♦</span>
          <span className="story-splash-spark story-splash-spark-two">♦</span>
          <img src="/ai-for-all/Mascot-look-down.png" alt="" className="story-splash-mascot" />
        </div>

        <section className="story-splash-card" aria-label={`${story.title} introduction`}>
          <p>
            Read the story, follow the prompts, and choose between two options to continue.
            Your choices shape the story while helping you discover how AI can support learning.
          </p>
          <button type="button" className="story-splash-start" onClick={startStory}>
            <span>Start Story</span>
            <span className="story-splash-start-arrow" aria-hidden="true">
              <ArrowRight size={17} strokeWidth={2.7} />
            </span>
          </button>
        </section>
      </main>
    )
  }

  return (
    <main className="story-scene-page">
      <header className="story-scene-header">
        <button type="button" onClick={() => router.push('/stories')} aria-label="Exit story">
          <ArrowLeft size={16} strokeWidth={2.8} />
        </button>
        <strong>Study with AI</strong>
      </header>

      <div className="story-scene-avatar">
        <StoryAiFace className="story-ai-face" />
      </div>

      <div className="story-transcript" ref={transcriptRef} aria-live="polite">
        {messages.map((message) => (
          <div
            key={message.id}
            className={`story-chat-message story-chat-message-${message.role}`}
          >
            {message.text}
          </div>
        ))}

        {step === 'scene' && isTyping && (
          <>
            {typedText ? (
              <div className="story-chat-message story-chat-message-ai story-chat-message-typing">
                {typedText}
                <span className="typewriter-caret" aria-hidden="true" />
              </div>
            ) : (
              <div className="story-typing-pill" aria-label="AI is typing">
                <span />
                <span />
                <span />
              </div>
            )}
          </>
        )}

        {step === 'gate' && (
          <div className="story-chat-message story-chat-message-ai">
            This story ends with a free-text activity for registered learners. Sign up to unlock it — or skip
            ahead for now.
          </div>
        )}

        {step === 'activity' && (
          <div className="story-chat-message story-chat-message-ai">
            {activityPrompt || 'Try to prompt'}
          </div>
        )}

        {step === 'response' && (
          <>
            <div className="story-chat-message story-chat-message-ai story-response-enter">
              AI is like a little mind that watches, learns, and gets better each time you show it something new.
            </div>
            <div className="story-chat-message story-chat-message-ai story-response-enter story-response-enter-delay">
              Nice work — your answer showed real thinking about {story.category.toLowerCase()}.
            </div>
          </>
        )}
      </div>

      {step === 'scene' && currentScene && (
        <div className={`story-scene-choices${choicesVisible ? ' is-visible' : ''}`}>
          {(currentScene.choices || []).slice(0, 2).map((choice, optionIndex) => (
            <button
              key={choice.id}
              type="button"
              className={`story-scene-choice story-scene-choice-${optionIndex + 1}`}
              onClick={() => choose(choice, optionIndex)}
              disabled={!choicesVisible}
            >
              {optionIndex + 1}. {choice.label}
            </button>
          ))}
        </div>
      )}

      {step === 'gate' && (
        <div className="story-scene-choices is-visible">
          <Link href="/sign-up" className="story-scene-choice story-scene-choice-primary story-scene-choice-link">
            Sign Up
          </Link>
          <button type="button" className="story-scene-choice" onClick={() => setStep('cleared')}>
            Skip for now
          </button>
        </div>
      )}

      {step === 'activity' && (
        <form className="story-activity" onSubmit={submitActivity}>
          <div className="story-activity-row">
            <input
              className="story-activity-field"
              placeholder="e.g. What is AI?"
              value={promptText}
              onChange={(e) => setPromptText(e.target.value)}
              aria-label="Your response"
            />
            <button
              type="submit"
              className="story-activity-send"
              aria-label="Send"
              disabled={!promptText.trim()}
            >
              <Send size={15} />
            </button>
          </div>
        </form>
      )}

      {step === 'response' && (
        <button type="button" className="story-response-finish" onClick={() => setStep('cleared')}>
          Finish
        </button>
      )}
    </main>
  )
}

function StoryCleared({ story, isGuest }: { story: StoryModule; isGuest: boolean }) {
  return (
    <main className="story-cleared-page">
      <div className="story-cleared-sunburst" aria-hidden="true">
        {Array.from({ length: 16 }).map((_, i) => (
          <span key={i} className="story-cleared-ray" style={{ '--ray-index': i } as CSSProperties} />
        ))}
      </div>
      <div className="story-cleared-sun-wrap" aria-hidden="true">
        <div className="story-cleared-sun-glow" />
        <div className="story-cleared-sun-core">
          <Sun size={56} strokeWidth={1.5} />
        </div>
        <span className="story-cleared-spark story-cleared-spark--1">✦</span>
        <span className="story-cleared-spark story-cleared-spark--2">✦</span>
        <span className="story-cleared-spark story-cleared-spark--3">·</span>
        <span className="story-cleared-spark story-cleared-spark--4">·</span>
      </div>
      <h1 className="story-cleared-title">Story Cleared!</h1>
      <div className="story-cleared-card">
        {isGuest ? (
          <>
            <div className="story-cleared-cta-row">
              <div className="story-cleared-cta-icon story-cleared-cta-icon--lock">
                <Lock size={20} />
              </div>
              <strong className="story-cleared-cta-label">Unlock more stories!</strong>
              <Link href="/sign-up" className="story-cleared-btn">
                Sign Up
              </Link>
            </div>
            <div className="story-cleared-divider" />
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
          <>
            <div className="story-cleared-cta-row">
              <div className="story-cleared-cta-icon story-cleared-cta-icon--lock">
                <Lock size={20} />
              </div>
              <strong className="story-cleared-cta-label">Unlock more stories!</strong>
              <Link href="/sign-up" className="story-cleared-btn">
                Sign Up
              </Link>
            </div>
            <div className="story-cleared-divider" />
            <div className="story-cleared-cta-row">
              <div className="story-cleared-cta-icon story-cleared-cta-icon--book">
                <BookOpen size={20} />
                <Star size={10} className="story-cleared-book-star" />
              </div>
              <strong className="story-cleared-cta-label">Want to learn more about AI?</strong>
              {story.skillsBuildUrl ? (
                <a href={story.skillsBuildUrl} target="_blank" rel="noreferrer" className="story-cleared-btn">
                  Story
                </a>
              ) : (
                <Link href={`/stories/${story.id}`} className="story-cleared-btn">
                  Story
                </Link>
              )}
            </div>
            <Link href="/home" className="story-cleared-back">
              Back
            </Link>
          </>
        )}
      </div>
    </main>
  )
}