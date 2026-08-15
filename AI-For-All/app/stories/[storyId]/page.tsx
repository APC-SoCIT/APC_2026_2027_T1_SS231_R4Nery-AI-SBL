'use client'

import { useState, type FormEvent } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Check, Send, Sun } from 'lucide-react'
import { getStory, storyScripts } from '@/lib/stories'
import { getMockSession } from '@/lib/mock-auth'

type Step = 'splash' | 'scene1' | 'scene2' | 'activity' | 'response' | 'cleared'

export default function StoryScenePage() {
  const params = useParams<{ storyId: string }>()
  const router = useRouter()
  const story = getStory(params.storyId)
  const script = storyScripts[params.storyId]

  const [step, setStep] = useState<Step>('splash')
  const [promptText, setPromptText] = useState('')

  if (!story || !script) {
    return (
      <main className="story-scene-page">
        <p style={{ padding: 24 }}>We couldn&apos;t find that story.</p>
        <Link href="/stories" className="stories-cta" style={{ margin: 24 }}>
          Back to Select Story
        </Link>
      </main>
    )
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
          <p>A story about {story.title.toLowerCase()}.</p>
          <button type="button" className="stories-cta" onClick={() => setStep('scene1')}>
            Start Story
          </button>
        </div>
      </main>
    )
  }

  if (step === 'cleared') {
    return <StoryCleared storyId={story.id} />
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
        {(step === 'scene1' || step === 'scene2') && <span className="story-scene-dots">•••</span>}
      </div>

      {step === 'scene1' && (
        <>
          <div className="story-scene-bubble">{script.scene1.message}</div>
          <div className="story-scene-choices">
            {script.scene1.choices.map((choice, i) => (
              <button key={choice} type="button" className="choice-button" onClick={() => setStep('scene2')}>
                {i + 1}. {choice}
              </button>
            ))}
          </div>
        </>
      )}

      {step === 'scene2' && (
        <>
          <div className="story-scene-bubble">{script.scene2.message}</div>
          <div className="story-scene-choices">
            {script.scene2.choices.map((choice, i) => (
              <button key={choice} type="button" className="choice-button" onClick={() => setStep('activity')}>
                {i + 1}. {choice}
              </button>
            ))}
          </div>
        </>
      )}

      {step === 'activity' && (
        <form className="story-activity" onSubmit={submitActivity}>
          <div className="story-scene-bubble">Try to prompt</div>
          <div className="story-activity-row">
            <input
              className="story-activity-field"
              placeholder={script.activityPlaceholder}
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
          {script.response.map((line) => (
            <div className="story-scene-bubble" key={line}>
              {line}
            </div>
          ))}
          <button type="button" className="stories-cta" onClick={() => setStep('cleared')}>
            Finish
          </button>
        </>
      )}
    </main>
  )
}

function StoryCleared({ storyId }: { storyId: string }) {
  const session = getMockSession()
  const isGuest = !session

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
          <div className="story-cleared-row">
            <strong>Want to learn more about AI?</strong>
            <a href="https://skillsbuild.org" target="_blank" rel="noreferrer" className="secondary-button">
              IBM SkillsBuild
            </a>
          </div>
          <Link href="/" className="text-button story-cleared-backhome">
            Back Home
          </Link>
        </div>
      ) : (
        <div className="story-cleared-card">
          <div className="story-cleared-row">
            <strong>Want to learn more about AI?</strong>
            <a href="https://skillsbuild.org" target="_blank" rel="noreferrer" className="secondary-button">
              IBM SkillsBuild Link
            </a>
          </div>
          <div className="story-cleared-row">
            <strong>Explore More Stories</strong>
            <Link href="/stories" className="stories-cta">
              Explore Stories
            </Link>
          </div>
          <Link href={`/stories/${storyId}`} className="text-button">
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