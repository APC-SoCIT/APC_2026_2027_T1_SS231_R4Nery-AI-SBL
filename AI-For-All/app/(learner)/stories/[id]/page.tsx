'use client'

import { useState, useEffect } from 'react'
import { ArrowLeft, Check, ChevronRight, Lock, Sparkles, UserCheck, ShieldCheck } from 'lucide-react'
import { useRouter, useParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { fetchStoryById } from '@/lib/supabase/stories'
import { StoryModule } from '@/lib/story-data'

export default function StoryPage() {
  const router = useRouter()
  const params = useParams()
  const storyId = (params?.id as string) || '0'

  const [story, setStory] = useState<StoryModule | null>(null)
  const [loading, setLoading] = useState(true)
  
  // Scene Navigation & Weight Score State
  const [sceneIndex, setSceneIndex] = useState(0)
  const [scoreWeight, setScoreWeight] = useState(0)
  const [selectedChoiceId, setSelectedChoiceId] = useState<string | null>(null)

  // Auth State
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  
  // Activity Response State
  const [activityResponse, setActivityResponse] = useState('')
  const [submittedActivity, setSubmittedActivity] = useState(false)

  useEffect(() => {
    async function init() {
      setLoading(true)
      // Check auth status
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      setIsLoggedIn(!!user)

      // Fetch story
      const loadedStory = await fetchStoryById(storyId)
      if (loadedStory) {
        setStory(loadedStory)
      }
      setLoading(false)
    }
    init()
  }, [storyId])

  if (loading) {
    return (
      <section className="story-page" style={{ padding: '4rem 1rem', textAlign: 'center' }}>
        <p>Loading interactive story...</p>
      </section>
    )
  }

  if (!story) {
    return (
      <section className="story-page" style={{ padding: '4rem 1rem', textAlign: 'center' }}>
        <h2>Story not found</h2>
        <button className="primary-button" style={{ marginTop: '1rem' }} onClick={() => router.push('/stories')}>
          Back to Stories
        </button>
      </section>
    )
  }

  const scenes = story.scenes || []
  const isLastScene = sceneIndex >= scenes.length
  const currentScene = scenes[sceneIndex]

  // Choice Selection (Max 2 choices: Choice A = +1, Choice B = -1)
  const handleSelectChoice = (weight: number, choiceId: string) => {
    setSelectedChoiceId(choiceId)
    setScoreWeight(prev => prev + weight)
  }

  const handleNextScene = () => {
    setSelectedChoiceId(null)
    setSceneIndex(prev => prev + 1)
  }

  // Calculate activity route prompt based on score weight:
  // Cumulative weight >= 0 -> Intellect Route
  // Cumulative weight < 0  -> Other / Creative Route
  const isIntellectRoute = scoreWeight >= 0
  const activePrompt = isIntellectRoute
    ? (story.activity?.intellectPrompt || 'Intellect Route: Analyze how structured inputs and clear goals improve AI performance.')
    : (story.activity?.otherRoutePrompt || 'Creative Route: Write a creative scenario where imaginative thinking guides AI to a surprising discovery.')

  return (
    <section className="story-page">
      {/* Toolbar */}
      <div className="story-toolbar">
        <button className="back-button" onClick={() => router.push('/stories')}>
          <ArrowLeft size={18}/> Stories
        </button>
        <span className="story-progress">
          {isLastScene ? 'Completion' : `Scene ${sceneIndex + 1} of ${scenes.length}`}
        </span>
      </div>
      
      {/* Progress Track */}
      <div className="progress-track">
        <span style={{ width: `${Math.min(100, ((sceneIndex + 1) / (scenes.length + (story.type === 'with_activity' ? 1 : 0))) * 100)}%` }}/>
      </div>
      
      <div className="scene-card">
        {/* Story Art / Header */}
        <div className="scene-art" style={{ background: story.color || '#79a8ff' }}>
          <div className="ai-orb">●</div>
          <span>{story.title} · {story.type === 'with_activity' ? 'With Activity' : 'Tap Choices'}</span>
        </div>

        <div className="scene-copy">
          {!isLastScene ? (
            /* --- SCENE PLAY MODE --- */
            <div>
              <p className="kicker">{currentScene?.eyebrow || `${story.title.toUpperCase()} · SCENE ${sceneIndex + 1}`}</p>
              <h2>{currentScene?.title || `Scene ${sceneIndex + 1}`}</h2>
              <p style={{ fontSize: '1.05rem', lineHeight: '1.6', margin: '1rem 0 1.5rem 0' }}>
                {currentScene?.body}
              </p>
              
              {/* Max 2 Choice Buttons */}
              <div style={{ display: 'grid', gap: '0.75rem', marginBottom: '1.5rem' }}>
                {currentScene?.choices && currentScene.choices.length > 0 ? (
                  currentScene.choices.slice(0, 2).map((choice, idx) => {
                    const isSelected = selectedChoiceId === choice.id
                    // Default choice weights if missing: Choice A = +1, Choice B = -1
                    const weightVal = typeof choice.weight === 'number' ? choice.weight : (idx === 0 ? 1 : -1)

                    return (
                      <button
                        key={choice.id || idx}
                        className={`choice-button ${isSelected ? 'selected' : ''}`}
                        onClick={() => handleSelectChoice(weightVal, choice.id || `c-${idx}`)}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justify-content: 'space-between',
                          padding: '1rem 1.25rem',
                          borderRadius: '12px',
                          border: isSelected ? '2px solid #0755b9' : '1px solid #c0cef7',
                          background: isSelected ? '#eaf2ff' : '#f8faff',
                          cursor: 'pointer',
                          textAlign: 'left',
                          fontWeight: isSelected ? 700 : 500,
                          fontSize: '0.95rem'
                        }}
                      >
                        <span>{choice.label}</span>
                        {isSelected && <Check size={18} style={{ color: '#0755b9' }}/>}
                      </button>
                    )
                  })
                ) : (
                  <button className="choice-button selected" onClick={() => handleNextScene()}>
                    Continue <ChevronRight size={18}/>
                  </button>
                )}
              </div>

              {currentScene?.choices && currentScene.choices.length > 0 && (
                <button
                  className="primary-button"
                  disabled={!selectedChoiceId}
                  onClick={handleNextScene}
                  style={{ width: '100%', opacity: selectedChoiceId ? 1 : 0.5 }}
                >
                  Confirm Choice & Next Scene <ChevronRight size={18}/>
                </button>
              )}
            </div>
          ) : (
            /* --- END STORY MODE --- */
            <div>
              {story.type === 'choices_only' ? (
                /* CHOICES ONLY END SCREEN */
                <div>
                  <p className="kicker">STORY COMPLETE</p>
                  <h2>You Completed {story.title}!</h2>
                  <p style={{ margin: '1rem 0 1.5rem 0', fontSize: '1rem', lineHeight: '1.6' }}>
                    You successfully guided the story through thoughtfulness and curiosity!
                    Your choice route balance score: <strong>{scoreWeight >= 0 ? `+${scoreWeight} (Intellect Route)` : `${scoreWeight} (Creative Route)`}</strong>.
                  </p>

                  {story.skillsBuildUrl && (
                    <div style={{ background: '#f0f4ff', padding: '1rem', borderRadius: '12px', marginBottom: '1.5rem', border: '1px solid #79a8ff' }}>
                      <strong style={{ color: '#0755b9', display: 'block', marginBottom: '0.25rem' }}>Want to learn more?</strong>
                      <a
                        href={story.skillsBuildUrl}
                        target="_blank"
                        rel="noreferrer"
                        style={{ color: '#0755b9', fontWeight: 700, textDecoration: 'underline', fontSize: '0.95rem' }}
                      >
                        {story.skillsBuildButtonText || 'Take Course on IBM SkillsBuild'} →
                      </a>
                    </div>
                  )}

                  <button className="primary-button" style={{ width: '100%' }} onClick={() => router.push('/dashboard')}>
                    Finish & Return to Dashboard <Check size={18}/>
                  </button>
                </div>
              ) : (
                /* WITH ACTIVITY END SCREEN */
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                    <span className="kicker" style={{ margin: 0 }}>END ACTIVITY SECTION</span>
                    <span style={{
                      fontSize: '0.75rem',
                      padding: '2px 10px',
                      borderRadius: '12px',
                      fontWeight: 700,
                      background: isIntellectRoute ? '#dbe8ff' : '#ffe2df',
                      color: isIntellectRoute ? '#04387d' : '#90120a'
                    }}>
                      {isIntellectRoute ? 'Intellect Route (Score >= 0)' : 'Creative Route (Score < 0)'}
                    </span>
                  </div>

                  <h2>Interactive Reflection Activity</h2>
                  
                  {isLoggedIn ? (
                    /* LOGGED IN USER: UNLOCKED FREE-TEXT ACTIVITY */
                    <div style={{ marginTop: '1rem' }}>
                      <div style={{ background: '#f0f4ff', border: '1px solid #79a8ff', padding: '1.25rem', borderRadius: '12px', marginBottom: '1.25rem' }}>
                        <p style={{ margin: 0, fontWeight: 700, color: '#0755b9', fontSize: '1.05rem', lineHeight: '1.5' }}>
                          {activePrompt}
                        </p>
                      </div>

                      {!submittedActivity ? (
                        <div style={{ display: 'grid', gap: '1rem' }}>
                          <label style={{ fontWeight: 700, fontSize: '0.9rem' }}>
                            Your Reflection Response (Free-Text):
                            <textarea
                              rows={4}
                              value={activityResponse}
                              onChange={e => setActivityResponse(e.target.value)}
                              placeholder="Type your response here..."
                              style={{ width: '100%', padding: '0.75rem', marginTop: '0.5rem', borderRadius: '10px', border: '1px solid #ccc', fontSize: '0.95rem' }}
                            />
                          </label>

                          <button
                            className="primary-button"
                            disabled={!activityResponse.trim()}
                            onClick={() => setSubmittedActivity(true)}
                            style={{ width: '100%', opacity: activityResponse.trim() ? 1 : 0.5 }}
                          >
                            Submit Activity & Complete Story <Check size={18}/>
                          </button>
                        </div>
                      ) : (
                        <div style={{ textAlign: 'center', padding: '1.5rem', background: '#eafaf1', border: '1px solid #2ecc71', borderRadius: '12px' }}>
                          <h3 style={{ color: '#27ae60', margin: '0 0 0.5rem 0' }}>Activity Submitted! 🎉</h3>
                          <p style={{ margin: '0 0 1rem 0' }}>Your response was recorded. Great work engaging with the AI learning story!</p>
                          <button className="primary-button" onClick={() => router.push('/dashboard')}>
                            Return to Dashboard <Check size={18}/>
                          </button>
                        </div>
                      )}
                    </div>
                  ) : (
                    /* GUEST USER: LOCKED ACTIVITY */
                    <div style={{ marginTop: '1rem', border: '2px dashed #ff766e', background: '#fff5f5', padding: '1.5rem', borderRadius: '16px', textAlign: 'center' }}>
                      <div style={{ display: 'inline-flex', padding: '0.75rem', borderRadius: '50%', background: '#ffe2df', color: '#c92a20', marginBottom: '0.75rem' }}>
                        <Lock size={28}/>
                      </div>
                      <h3 style={{ color: '#c92a20', margin: '0 0 0.5rem 0' }}>Activity Locked for Guests</h3>
                      <p style={{ fontSize: '0.95rem', lineHeight: '1.5', color: '#555', marginBottom: '1.25rem' }}>
                        This Free-Text Reflection Activity is available exclusively for registered learners. Log in or create an account to unlock the activity, submit your response, and claim your rewards!
                      </p>

                      <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center' }}>
                        <button className="primary-button" onClick={() => router.push('/auth?mode=signin')}>
                          Log in to Unlock
                        </button>
                        <button className="secondary-button" onClick={() => router.push('/auth?mode=signup')}>
                          Sign up
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </section>
  )
}
