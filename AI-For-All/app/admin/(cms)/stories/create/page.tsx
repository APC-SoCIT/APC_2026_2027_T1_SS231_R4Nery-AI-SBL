'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { StoryModule, StoryScene } from '@/lib/story-data'
import { saveStoryToDb } from '@/lib/supabase/stories'
import styles from './create.module.css'
import { GeneratingMascot } from './GeneratingMascot'

const GEN_CHECKLIST = [
  { label: 'Understanding your inputs', at: 15 },
  { label: 'Planning the story structure', at: 45 },
  { label: 'Writing scenes and dialogues', at: 75 },
  { label: 'Finalizing choices', at: 100 },
]

export default function CreateStoryWizard() {
  const router = useRouter()
  const [step, setStep] = useState(1)
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [progress, setProgress] = useState(0)
  const [genError, setGenError] = useState<string | null>(null)

  // Fake-but-smooth progress bar while the AI request is in flight.
  // Creeps up to 90% on its own; handleGenerateStory jumps it to 100
  // once the real response has actually arrived.
  useEffect(() => {
    if (step !== 2 || !loading) return
    setProgress(0)
    let value = 0
    const timer = setInterval(() => {
      value = Math.min(90, value + Math.random() * 14 + 6)
      setProgress(Math.round(value))
    }, 350)
    return () => clearInterval(timer)
  }, [step, loading])

  // Step 1 Form State
  const [title, setTitle] = useState('')
  const [concept, setConcept] = useState('')
  const [genre, setGenre] = useState('Adventure')
  const [level, setLevel] = useState('Starter')
  const [sceneCount, setSceneCount] = useState(3)
  const [storyType, setStoryType] = useState<'choices_only' | 'with_activity'>('choices_only')

  // Step 3 Review & Edit State
  const [generatedStory, setGeneratedStory] = useState<StoryModule | null>(null)
  const [activeSceneIndex, setActiveSceneIndex] = useState(0)

  // Step 4 Settings
  const [status, setStatus] = useState<'Draft' | 'Published'>('Published')
  const [skillsBuildUrl, setSkillsBuildUrl] = useState('https://skillsbuild.org')
  const [skillsBuildButtonText, setSkillsBuildButtonText] = useState('Explore IBM Course')
  const [allowFreeText, setAllowFreeText] = useState(true)
  const [storyFor, setStoryFor] = useState<'all' | 'guests' | 'registered'>('all')
  const [goalboardTopics, setGoalboardTopics] = useState<string[]>([])
  const [gbCustomTopic, setGbCustomTopic] = useState('')

  const TOPIC_COLORS_WIZARD: Record<string, string> = {
    'AI Concepts':'#818cf8','Smart Helpers':'#38bdf8','Creative Thinking':'#fb923c',
    'Fairness in Technology':'#4ade80','Rate Limiting':'#f87171','Prompt Engineering':'#fbbf24',
    'Ethics in AI':'#a78bfa','Machine Learning':'#34d399','Data & Privacy':'#60a5fa','Robotics':'#f472b6',
  }
  const gbTopicColor = (t: string) => TOPIC_COLORS_WIZARD[t] ?? '#94a3b8'
  const gbToggleTopic = (t: string) =>
    setGoalboardTopics(prev => prev.includes(t) ? prev.filter(x => x !== t) : [...prev, t])
  const gbAddCustom = () => {
    const v = gbCustomTopic.trim()
    if (!v) return
    if (!goalboardTopics.includes(v)) setGoalboardTopics(prev => [...prev, v])
    setGbCustomTopic('')
  }

  // Trigger AI Story Generation
  const handleGenerateStory = async () => {
    setStep(2)
    setLoading(true)
    setGenError(null)

    try {
      const res = await fetch('/api/admin/generate-story', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          concept,
          genre,
          type: storyType,
          sceneCount,
        })
      })

      const data = await res.json()
      if (!res.ok || data.error) {
        throw new Error(data.error || `API returned status ${res.status}`)
      }
      if (data.story) {
        setGeneratedStory(data.story)
        setLoading(false)
        setProgress(100)
        await new Promise(r => setTimeout(r, 500))
        setStep(3)
      } else {
        throw new Error('No story data in response')
      }
    } catch (err: any) {
      console.error('Error generating story:', err)
      setGenError(err?.message || 'Failed to generate story. Please try again.')
      setLoading(false)
      setProgress(0)
      setStep(1)
    }
  }

  const handleNext = () => {
    if (step === 1) {
      handleGenerateStory()
    } else if (step < 4) {
      setStep(step + 1)
    } else {
      handlePublish()
    }
  }

  const handleBack = () => {
    if (step > 1) setStep(step - 1)
    else router.push('/admin/stories')
  }

  // Save story to DB & navigate
  const handlePublish = async () => {
    if (!generatedStory) return
    setSaving(true)

    const effectiveTopics = goalboardTopics.length ? goalboardTopics : [concept || generatedStory.category || 'Uncategorised']

    const finalStory: StoryModule = {
      ...generatedStory,
      id: generatedStory.id || `story-${Date.now()}`,
      title: title || generatedStory.title,
      category: effectiveTopics[0],
      level,
      type: storyType,
      status,
      skillsBuildUrl,
      skillsBuildButtonText,
      allowFreeText,
      storyFor,
      updatedAt: 'Just now',
      createdAt: new Date().toISOString(),
    }

    await saveStoryToDb(finalStory)

    // Register on the goalboard with all chosen topics (multi-topic support)
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem('ai_for_all_goalboard')
        const board = saved ? JSON.parse(saved) : { boardIds: [], topicOverrides: {} }
        if (!board.boardIds.includes(finalStory.id)) board.boardIds.push(finalStory.id)
        board.topicOverrides[finalStory.id] = effectiveTopics
        localStorage.setItem('ai_for_all_goalboard', JSON.stringify(board))
      } catch { /* noop */ }
    }

    setSaving(false)
    router.push('/admin/stories')
  }

  // Update scene in active state
  const updateActiveScene = (field: string, value: any) => {
    if (!generatedStory) return
    const updatedScenes = [...generatedStory.scenes]
    updatedScenes[activeSceneIndex] = {
      ...updatedScenes[activeSceneIndex],
      [field]: value
    }
    setGeneratedStory({ ...generatedStory, scenes: updatedScenes })
  }

  // Update choice label
  const updateChoiceLabel = (choiceIndex: number, label: string) => {
    if (!generatedStory) return
    const currentScene = generatedStory.scenes[activeSceneIndex]
    const choices = [...(currentScene.choices || [])]
    if (choices[choiceIndex]) {
      choices[choiceIndex] = { ...choices[choiceIndex], label }
    }
    updateActiveScene('choices', choices)
  }

  // Update activity prompt
  const updateActivityPrompt = (field: 'intellectPrompt' | 'otherRoutePrompt', text: string) => {
    if (!generatedStory) return
    setGeneratedStory({
      ...generatedStory,
      activity: {
        intellectPrompt: field === 'intellectPrompt' ? text : (generatedStory.activity?.intellectPrompt || ''),
        otherRoutePrompt: field === 'otherRoutePrompt' ? text : (generatedStory.activity?.otherRoutePrompt || '')
      }
    })
  }

  const currentScene = generatedStory?.scenes?.[activeSceneIndex]

  return (
    <section className={styles.wizardContainer}>
      <div className={styles.wizardHeader}>
        <div>
          <h2>
            {step === 1 ? 'Create New Story' :
              step === 2 ? 'Generating Story Magic...' :
                step === 3 ? 'Review and Edit Story' : 'Final Settings & Save'}
          </h2>
          <p>
            {step === 1 ? 'Configure your story type, options, and topic' :
              step === 2 ? 'Our AI is weaving characters, scenes, and tap choices together' :
                step === 3 ? 'Tweak the narration, tap choices, and end activities' : 'Publish your story to the database'}
          </p>
        </div>
        <div className={styles.stepIndicator}>
          Step {step} of 4
        </div>
      </div>

      <div style={{ minHeight: '380px' }}>
        {/* STEP 1: OPTIONS & BASIC INFO */}
        {step === 1 && (
          <div>
            {genError && (
              <div style={{
                background: '#fef2f2',
                border: '1px solid #fecaca',
                borderRadius: '8px',
                padding: '12px 16px',
                marginBottom: '16px',
                color: '#991b1b',
                fontSize: '14px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}>
                <span style={{ fontSize: '18px' }}>⚠️</span>
                <span><strong>Generation failed:</strong> {genError}</span>
              </div>
            )}
            <div className={styles.row}>
              <div className={styles.col}>
                <div className={styles.inputGroup}>
                  <label className={styles.inputLabel}>Story Title</label>
                  <input
                    className={styles.textInput}
                    value={title}
                    onChange={e => setTitle(e.target.value)}
                    placeholder="e.g. The Robot Assistant"
                  />
                </div>
              </div>
              <div className={styles.col}>
                <div className={styles.inputGroup}>
                  <label className={styles.inputLabel}>AI Concept to Teach</label>
                  <input
                    className={styles.textInput}
                    value={concept}
                    onChange={e => setConcept(e.target.value)}
                    placeholder="e.g. Smart Helpers, Fairness in Technology"
                  />
                </div>
              </div>
            </div>

            <div className={styles.row}>
              <div className={styles.col}>
                <div className={styles.inputGroup}>
                  <label className={styles.inputLabel}>Genre</label>
                  <select className={styles.selectInput} value={genre} onChange={e => setGenre(e.target.value)}>
                    <option value="Adventure">Adventure</option>
                    <option value="Sci-Fi">Sci-Fi</option>
                    <option value="Mystery">Mystery</option>
                    <option value="Slice of Life">Slice of Life</option>
                  </select>
                </div>
              </div>
              <div className={styles.col}>
                <div className={styles.inputGroup}>
                  <label className={styles.inputLabel}>Level</label>
                  <select className={styles.selectInput} value={level} onChange={e => setLevel(e.target.value)}>
                    <option value="Starter">Starter</option>
                    <option value="Intermediate">Intermediate</option>
                    <option value="Advanced">Advanced</option>
                  </select>
                </div>
              </div>
              <div className={styles.col}>
                <div className={styles.inputGroup}>
                  <label className={styles.inputLabel}>Number of Scenes</label>
                  <select className={styles.selectInput} value={sceneCount} onChange={e => setSceneCount(Number(e.target.value))}>
                    <option value={3}>3 Scenes</option>
                    <option value={4}>4 Scenes</option>
                    <option value={5}>5 Scenes</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Interaction Type Selection */}
            <div className={styles.inputGroup} style={{ marginTop: '10px' }}>
              <label className={styles.inputLabel}>Story Interaction Flow</label>
              <div className={styles.radioCardGroup}>
                <label className={`${styles.radioCard} ${storyType === 'choices_only' ? styles.active : ''}`}>
                  <input
                    type="radio"
                    name="storyType"
                    value="choices_only"
                    checked={storyType === 'choices_only'}
                    onChange={() => setStoryType('choices_only')}
                  />
                  <span className={styles.radioCardTitle}>Tap Choices Only</span>
                  <span className={styles.radioCardDesc}>Learners play through scenes by tapping maximum 2 choices. Simple and quick.</span>
                </label>

                <label className={`${styles.radioCard} ${storyType === 'with_activity' ? styles.active : ''}`}>
                  <input
                    type="radio"
                    name="storyType"
                    value="with_activity"
                    checked={storyType === 'with_activity'}
                    onChange={() => setStoryType('with_activity')}
                  />
                  <span className={styles.radioCardTitle}>With End Activity</span>
                  <span className={styles.radioCardDesc}>Adds a free-text activity at the end based on choice score. Guests will be asked to log in!</span>
                </label>
              </div>
            </div>
          </div>
        )}

        {/* STEP 2: GENERATING VIEW */}
        {step === 2 && (
          <div className={styles.generatingLayout}>
            <div className={styles.generatingLeft}>
              <GeneratingMascot />
              <div className={styles.progressRing} style={{ ['--pct' as any]: progress }}>
                <span>{progress}%</span>
              </div>
            </div>

            <div className={styles.generatingRight}>
              <h3>Generating your Story</h3>
              <p className={styles.generatingSub}>Our AI is generating an engaging story</p>
              <div className={styles.generatingChecklist}>
                {GEN_CHECKLIST.map(item => {
                  const done = progress >= item.at
                  const active = !done && progress >= (GEN_CHECKLIST[GEN_CHECKLIST.indexOf(item) - 1]?.at ?? 0)
                  return (
                    <div key={item.label} className={`${styles.checkItem} ${done ? styles.checkDone : active ? styles.checkActive : styles.checkPending}`}>
                      <span className={styles.checkIcon}>{done ? '✓' : ''}</span>
                      {item.label}
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        )}

        {/* STEP 3: REVIEW & EDIT */}
        {step === 3 && generatedStory && (
          <div className={styles.reviewLayout}>
            {/* Scenes Sidebar */}
            <div className={styles.sidebar}>
              <h4 style={{ margin: '0 0 10px 0', fontSize: '13px', color: '#64647b', textTransform: 'uppercase' }}>
                Story Flow ({generatedStory.scenes.length})
              </h4>
              {generatedStory.scenes.map((s, i) => (
                <div
                  key={s.id || i}
                  onClick={() => setActiveSceneIndex(i)}
                  className={`${styles.sceneTab} ${activeSceneIndex === i ? styles.active : ''}`}
                >
                  Scene {i + 1}: {s.title || `Scene ${i + 1}`}
                </div>
              ))}

              {storyType === 'with_activity' && (
                <div
                  onClick={() => setActiveSceneIndex(generatedStory.scenes.length)}
                  className={`${styles.sceneTab} ${styles.activityTab} ${activeSceneIndex === generatedStory.scenes.length ? styles.active : ''}`}
                  style={{ marginTop: '16px' }}
                >
                  End Activity Config
                </div>
              )}
            </div>

            {/* Scene / Activity Editor */}
            <div className={styles.editorArea}>
              {activeSceneIndex < generatedStory.scenes.length ? (
                <div>
                  <h3 style={{ margin: '0 0 20px 0' }}>Scene {activeSceneIndex + 1} Editor</h3>

                  <div className={styles.inputGroup}>
                    <label className={styles.inputLabel}>Scene Title</label>
                    <input
                      className={styles.textInput}
                      value={currentScene?.title || ''}
                      onChange={e => updateActiveScene('title', e.target.value)}
                    />
                  </div>

                  <div className={styles.inputGroup}>
                    <label className={styles.inputLabel}>Narration / Story Body</label>
                    <textarea
                      className={styles.textArea}
                      rows={5}
                      value={currentScene?.body || ''}
                      onChange={e => updateActiveScene('body', e.target.value)}
                    />
                  </div>

                  <div className={styles.choiceGrid}>
                    <div className={styles.choiceBox}>
                      <h5>Choice A</h5>
                      <textarea
                        className={styles.textArea}
                        style={{ minHeight: '80px' }}
                        value={currentScene?.choices?.[0]?.label || ''}
                        onChange={e => updateChoiceLabel(0, e.target.value)}
                        placeholder="Option A label"
                      />
                    </div>
                    <div className={styles.choiceBox}>
                      <h5>Choice B</h5>
                      <textarea
                        className={styles.textArea}
                        style={{ minHeight: '80px' }}
                        value={currentScene?.choices?.[1]?.label || ''}
                        onChange={e => updateChoiceLabel(1, e.target.value)}
                        placeholder="Option B label"
                      />
                    </div>
                  </div>
                </div>
              ) : (
                /* Activity Editor */
                <div>
                  <h3 style={{ margin: '0 0 10px 0', color: '#c92a20' }}>End Activity Configuration</h3>
                  <p style={{ color: '#64647b', fontSize: '14px', marginBottom: '24px' }}>
                    Based on the learner&apos;s choice weight score at the end, they will see one of these prompts.
                    Guests will be asked to log in to complete it.
                  </p>

                  <div className={styles.inputGroup}>
                    <label className={styles.inputLabel} style={{ color: '#0755b9' }}>
                      Intellect Route Prompt (Score &ge; 0)
                    </label>
                    <textarea
                      className={styles.textArea}
                      style={{ borderColor: '#b5ccff' }}
                      value={generatedStory.activity?.intellectPrompt || ''}
                      onChange={e => updateActivityPrompt('intellectPrompt', e.target.value)}
                      placeholder="Enter activity instructions for Intellect route..."
                    />
                  </div>

                  <div className={styles.inputGroup}>
                    <label className={styles.inputLabel} style={{ color: '#c92a20' }}>
                      Creative Route Prompt (Score &lt; 0)
                    </label>
                    <textarea
                      className={styles.textArea}
                      style={{ borderColor: '#ffb5b0' }}
                      value={generatedStory.activity?.otherRoutePrompt || ''}
                      onChange={e => updateActivityPrompt('otherRoutePrompt', e.target.value)}
                      placeholder="Enter activity instructions for Creative route..."
                    />
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* STEP 4: FINAL SETTINGS */}
        {step === 4 && (
          <div>
            <div className={styles.row} style={{ marginBottom: '24px' }}>
              <div className={styles.col}>
                <div className={styles.inputGroup} style={{ marginBottom: 0 }}>
                  <label className={styles.inputLabel}>Publishing Status</label>
                  <select className={styles.selectInput} value={status} onChange={e => setStatus(e.target.value as any)}>
                    <option value="Published">Published (Live to learners)</option>
                    <option value="Draft">Draft (Hidden)</option>
                  </select>
                </div>
              </div>
              <div className={styles.col}>
                <div className={styles.inputGroup} style={{ marginBottom: 0 }}>
                  <label className={styles.inputLabel}>Story Flow Type</label>
                  <div className={styles.readonlyPill}>
                    {storyType === 'with_activity' ? 'With End Activity' : 'Tap Choices Only'}
                  </div>
                </div>
              </div>
            </div>

            {/* Goalboard Topics — multi-select chip picker */}
            <div className={styles.inputGroup} style={{ marginBottom: '24px' }}>
              <label className={styles.inputLabel}>📌 Goalboard Topics</label>
              <p style={{ margin: '0 0 12px', fontSize: '12px', color: '#64647b' }}>
                Choose one or more topic groups for this quest on the Goal Board.
                Leave blank to use the AI&nbsp;Concept field. A quest can appear under multiple topics.
              </p>
              {/* Selected chips */}
              {goalboardTopics.length > 0 && (
                <div style={{ display:'flex', flexWrap:'wrap', gap:6, marginBottom:10 }}>
                  {goalboardTopics.map(t => (
                    <span key={t} style={{ display:'inline-flex', alignItems:'center', gap:5, padding:'4px 8px 4px 10px', borderRadius:20, fontSize:11, fontWeight:700, border:`1.5px solid ${gbTopicColor(t)}`, background:`color-mix(in srgb,${gbTopicColor(t)} 18%,white)`, color:'var(--ink)' }}>
                      <span style={{ width:7, height:7, borderRadius:'50%', background:gbTopicColor(t), flexShrink:0, display:'inline-block' }} />
                      {t}
                      <button onClick={() => gbToggleTopic(t)} style={{ display:'grid', placeItems:'center', width:14, height:14, borderRadius:'50%', background:'rgba(0,0,0,.12)', border:'none', cursor:'pointer', padding:0 }}>×</button>
                    </span>
                  ))}
                </div>
              )}
              {/* Preset chips */}
              <div style={{ display:'flex', flexWrap:'wrap', gap:7, marginBottom:10 }}>
                {Object.keys(TOPIC_COLORS_WIZARD).map(t => (
                  <button key={t} type="button"
                    onClick={() => gbToggleTopic(t)}
                    style={{ display:'inline-flex', alignItems:'center', gap:5, padding:'5px 11px', borderRadius:20, border: goalboardTopics.includes(t) ? `1.5px solid ${gbTopicColor(t)}` : '1.5px solid var(--line)', background: goalboardTopics.includes(t) ? `color-mix(in srgb,${gbTopicColor(t)} 15%,white)` : 'transparent', fontSize:12, fontWeight:600, cursor:'pointer', transition:'all .15s', color:'var(--ink)' }}>
                    <span style={{ width:7, height:7, borderRadius:'50%', background:gbTopicColor(t), flexShrink:0, display:'inline-block' }} />
                    {t}
                  </button>
                ))}
              </div>
              {/* Custom topic input */}
              <div style={{ display:'flex', gap:8 }}>
                <input
                  className={styles.textInput}
                  value={gbCustomTopic}
                  onChange={e => setGbCustomTopic(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && gbAddCustom()}
                  placeholder="+ Type a custom topic and press Enter"
                  style={{ flex:1 }}
                />
                {gbCustomTopic.trim() && (
                  <button type="button" className={styles.selectInput} style={{ width:'auto', padding:'0 14px', cursor:'pointer', background:'var(--ink)', color:'var(--white)', border:'none', borderRadius:8, fontSize:12, fontWeight:700 }} onClick={gbAddCustom}>Add</button>
                )}
              </div>
            </div>

            <div className={styles.settingsGrid}>
              <div className={styles.settingsPanel}>
                <h4>Permissions</h4>

                <div className={styles.toggleRow}>
                  <div>
                    <label className={styles.inputLabel} style={{ marginBottom: '2px' }}>Free Text AI Response</label>
                    <span className={styles.toggleHint}>For registered users only</span>
                  </div>
                  <button
                    type="button"
                    className={`${styles.toggleSwitch} ${allowFreeText ? styles.toggleOn : ''}`}
                    onClick={() => setAllowFreeText(v => !v)}
                    aria-pressed={allowFreeText}
                  >
                    <span className={styles.toggleKnob} />
                  </button>
                </div>

                <div className={styles.inputGroup} style={{ marginTop: '20px', marginBottom: 0 }}>
                  <label className={styles.inputLabel}>Story For:</label>
                  <select className={styles.selectInput} value={storyFor} onChange={e => setStoryFor(e.target.value as any)}>
                    <option value="all">Everyone (Guests + Registered)</option>
                    <option value="guests">Guests Only</option>
                    <option value="registered">Registered Users Only</option>
                  </select>
                </div>
              </div>

              <div className={styles.settingsPanel}>
                <h4>IBM SkillsBuild Link</h4>

                <div className={styles.inputGroup}>
                  <label className={styles.inputLabel}>URL</label>
                  <input
                    className={styles.textInput}
                    value={skillsBuildUrl}
                    onChange={e => setSkillsBuildUrl(e.target.value)}
                    placeholder="https://skillsbuild.org"
                  />
                </div>

                <div className={styles.inputGroup} style={{ marginBottom: 0 }}>
                  <label className={styles.inputLabel}>Button Text</label>
                  <input
                    className={styles.textInput}
                    value={skillsBuildButtonText}
                    onChange={e => setSkillsBuildButtonText(e.target.value)}
                    placeholder="Take Course"
                  />
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Navigation Footer */}
      <div className={styles.footer}>
        <button className={styles.btnSecondary} onClick={handleBack} disabled={loading || saving}>
          {step === 1 ? 'Cancel' : 'Back'}
        </button>
        <button className={styles.btnPrimary} onClick={handleNext} disabled={loading || saving}>
          {step === 1 ? 'Generate AI Story' :
            step === 2 ? 'Generating...' :
              step === 3 ? 'Final Settings →' :
                (saving ? 'Saving...' : 'Save & Publish')}
        </button>
      </div>
    </section>
  )
}