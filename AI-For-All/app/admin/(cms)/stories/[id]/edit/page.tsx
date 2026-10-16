'use client'

import { useState, useEffect, use } from 'react'
import { useRouter } from 'next/navigation'
import { StoryModule, StoryScene } from '@/lib/story-data'
import { fetchStoryById, saveStoryToDb } from '@/lib/supabase/stories'
import styles from '../../create/create.module.css'

export default function EditStoryPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [story, setStory] = useState<StoryModule | null>(null)
  
  // Editor State
  const [activeSceneIndex, setActiveSceneIndex] = useState(0)
  const [validationErrors, setValidationErrors] = useState<string[]>([])

  useEffect(() => {
    const loadStory = async () => {
      const data = await fetchStoryById(id)
      if (data) setStory(data)
      setLoading(false)
    }
    loadStory()
  }, [id])

  if (loading) {
    return (
      <section className={styles.wizardContainer} style={{ minHeight: '400px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div className={styles.pulseOrb}></div>
        <p>Loading story details...</p>
      </section>
    )
  }

  if (!story) {
    return (
      <section className={styles.wizardContainer}>
        <h2>Story not found</h2>
        <button className={styles.btnSecondary} onClick={() => router.push('/admin/stories')}>Back to Library</button>
      </section>
    )
  }

  // Update scene in active state
  const updateActiveScene = (field: string, value: any) => {
    const updatedScenes = [...story.scenes]
    updatedScenes[activeSceneIndex] = {
      ...updatedScenes[activeSceneIndex],
      [field]: value
    }
    setStory({ ...story, scenes: updatedScenes })
  }

  // Update choice label
  const updateChoiceLabel = (choiceIndex: number, label: string) => {
    const currentScene = story.scenes[activeSceneIndex]
    const choices = [...(currentScene.choices || [])]
    if (choices[choiceIndex]) {
      choices[choiceIndex] = { ...choices[choiceIndex], label }
    } else {
       // if the choice doesn't exist, we must create it with default weight
       choices[choiceIndex] = { 
           id: `c${activeSceneIndex}-${choiceIndex === 0 ? 'a' : 'b'}`, 
           label, 
           weight: choiceIndex === 0 ? 1 : -1 
       }
    }
    updateActiveScene('choices', choices)
  }

  // Update activity prompt
  const updateActivityPrompt = (field: 'intellectPrompt' | 'otherRoutePrompt', text: string) => {
    setStory({
      ...story,
      activity: {
        intellectPrompt: field === 'intellectPrompt' ? text : (story.activity?.intellectPrompt || ''),
        otherRoutePrompt: field === 'otherRoutePrompt' ? text : (story.activity?.otherRoutePrompt || '')
      }
    })
  }

  // Validate that no scene has blank body or blank choices
  const validateScenes = (): string[] => {
    const errors: string[] = []
    story.scenes.forEach((scene, i) => {
      const label = scene.title || `Scene ${i + 1}`
      if (!scene.body?.trim()) {
        errors.push(`${label}: Narration / Story Body cannot be empty.`)
      }
      const choices = scene.choices || []
      if (!choices[0]?.label?.trim()) {
        errors.push(`${label}: Choice A cannot be empty.`)
      }
      if (!choices[1]?.label?.trim()) {
        errors.push(`${label}: Choice B cannot be empty.`)
      }
    })
    return errors
  }

  const handleSave = async () => {
    const errors = validateScenes()
    if (errors.length > 0) {
      setValidationErrors(errors)
      // Jump to the first scene with an error
      const firstBadIdx = story.scenes.findIndex((s) => {
        if (!s.body?.trim()) return true
        if (!s.choices?.[0]?.label?.trim()) return true
        if (!s.choices?.[1]?.label?.trim()) return true
        return false
      })
      if (firstBadIdx >= 0) setActiveSceneIndex(firstBadIdx)
      return
    }
    setValidationErrors([])
    setSaving(true)
    const updatedStory = {
        ...story,
        updatedAt: new Date().toISOString()
    }
    await saveStoryToDb(updatedStory)
    setSaving(false)
    router.push('/admin/stories')
  }

  const currentScene = story.scenes[activeSceneIndex]

  return (
    <section className={styles.wizardContainer}>
      <div className={styles.wizardHeader}>
        <div>
          <h2>Edit Story: {story.title}</h2>
          <p>Tweak the narration, tap choices, and end activities for this story.</p>
        </div>
        <div className={styles.stepIndicator}>
          {story.status}
        </div>
      </div>

      <div style={{ minHeight: '380px' }}>
         {/* Basic Settings */}
         <div className={styles.row} style={{ marginBottom: '30px' }}>
           <div className={styles.col}>
             <label className={styles.inputLabel}>Story Title</label>
             <input 
               className={styles.textInput}
               value={story.title}
               onChange={e => setStory({ ...story, title: e.target.value })}
             />
           </div>
           <div className={styles.col}>
             <label className={styles.inputLabel}>Category (Concept)</label>
             <input 
               className={styles.textInput}
               value={story.category}
               onChange={e => setStory({ ...story, category: e.target.value })}
             />
           </div>
           <div className={styles.col}>
             <label className={styles.inputLabel}>Status</label>
             <select className={styles.selectInput} value={story.status} onChange={e => setStory({ ...story, status: e.target.value as any })}>
                <option value="Published">Published</option>
                <option value="Draft">Draft</option>
             </select>
           </div>
         </div>

         {validationErrors.length > 0 && (
           <div style={{
             background: '#fef2f2',
             border: '1px solid #fecaca',
             borderRadius: '8px',
             padding: '12px 16px',
             marginBottom: '16px',
             color: '#991b1b',
             fontSize: '14px',
           }}>
             <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
               <span style={{ fontSize: '18px' }}>⚠️</span>
               <strong>Please fill in all required fields before saving:</strong>
             </div>
             <ul style={{ margin: '0', paddingLeft: '24px' }}>
               {validationErrors.map((err, i) => (
                 <li key={i}>{err}</li>
               ))}
             </ul>
           </div>
         )}

         {/* Editor */}
         <div className={styles.reviewLayout}>
            {/* Scenes Sidebar */}
            <div className={styles.sidebar}>
              <h4 style={{ margin: '0 0 10px 0', fontSize: '13px', color: '#64647b', textTransform: 'uppercase' }}>
                Story Flow ({story.scenes.length})
              </h4>
              {story.scenes.map((s, i) => {
                const hasError = !s.body?.trim() || !s.choices?.[0]?.label?.trim() || !s.choices?.[1]?.label?.trim()
                return (
                <div
                  key={s.id || i}
                  onClick={() => { setActiveSceneIndex(i); setValidationErrors([]) }}
                  className={`${styles.sceneTab} ${activeSceneIndex === i ? styles.active : ''}`}
                  style={validationErrors.length > 0 && hasError ? { borderColor: '#ef4444', borderWidth: '1.5px', borderStyle: 'solid' } : undefined}
                >
                  Scene {i + 1}: {s.title || `Scene ${i + 1}`}
                  {validationErrors.length > 0 && hasError && <span style={{ color: '#ef4444', marginLeft: '6px', fontSize: '13px' }}>⚠</span>}
                </div>
                )
              })}

              {story.type === 'with_activity' && (
                <div
                  onClick={() => setActiveSceneIndex(story.scenes.length)}
                  className={`${styles.sceneTab} ${styles.activityTab} ${activeSceneIndex === story.scenes.length ? styles.active : ''}`}
                  style={{ marginTop: '16px' }}
                >
                  End Activity Config
                </div>
              )}
            </div>

            {/* Scene / Activity Editor */}
            <div className={styles.editorArea}>
              {activeSceneIndex < story.scenes.length ? (
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
                      style={!currentScene?.body?.trim() && validationErrors.length > 0 ? { borderColor: '#ef4444', borderWidth: '1.5px' } : undefined}
                    />
                    {!currentScene?.body?.trim() && validationErrors.length > 0 && (
                      <span style={{ color: '#ef4444', fontSize: '12px', marginTop: '4px' }}>Story body is required.</span>
                    )}
                  </div>

                  <div className={styles.choiceGrid}>
                    <div className={styles.choiceBox}>
                      <h5>Choice A</h5>
                      <textarea
                        className={styles.textArea}
                        style={{ minHeight: '80px', ...(!currentScene?.choices?.[0]?.label?.trim() && validationErrors.length > 0 ? { borderColor: '#ef4444', borderWidth: '1.5px' } : {}) }}
                        value={currentScene?.choices?.[0]?.label || ''}
                        onChange={e => updateChoiceLabel(0, e.target.value)}
                        placeholder="Option A label"
                      />
                      {!currentScene?.choices?.[0]?.label?.trim() && validationErrors.length > 0 && (
                        <span style={{ color: '#ef4444', fontSize: '12px', marginTop: '4px' }}>Choice A is required.</span>
                      )}
                    </div>
                    <div className={styles.choiceBox}>
                      <h5>Choice B</h5>
                      <textarea
                        className={styles.textArea}
                        style={{ minHeight: '80px', ...(!currentScene?.choices?.[1]?.label?.trim() && validationErrors.length > 0 ? { borderColor: '#ef4444', borderWidth: '1.5px' } : {}) }}
                        value={currentScene?.choices?.[1]?.label || ''}
                        onChange={e => updateChoiceLabel(1, e.target.value)}
                        placeholder="Option B label"
                      />
                      {!currentScene?.choices?.[1]?.label?.trim() && validationErrors.length > 0 && (
                        <span style={{ color: '#ef4444', fontSize: '12px', marginTop: '4px' }}>Choice B is required.</span>
                      )}
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
                      value={story.activity?.intellectPrompt || ''}
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
                      value={story.activity?.otherRoutePrompt || ''}
                      onChange={e => updateActivityPrompt('otherRoutePrompt', e.target.value)}
                      placeholder="Enter activity instructions for Creative route..."
                    />
                  </div>
                </div>
              )}
            </div>
          </div>
      </div>

      <div className={styles.footer}>
        <button className={styles.btnSecondary} onClick={() => router.push('/admin/stories')} disabled={saving}>
          Cancel
        </button>
        <button className={styles.btnPrimary} onClick={handleSave} disabled={saving}>
          {saving ? 'Saving...' : 'Save Changes'}
        </button>
      </div>
    </section>
  )
}
