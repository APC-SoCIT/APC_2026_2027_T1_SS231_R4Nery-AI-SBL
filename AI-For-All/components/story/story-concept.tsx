'use client'

/**
 * components/story/story-concept.tsx
 *
 * "What is this AI about?" screen. Rendered by app/stories/[storyId]/page.tsx
 * as the 'concept' step, right after the learner finishes the story and
 * BEFORE the "How was the Story?" reaction screen.
 */
import { StoryModule } from '@/lib/story-data'
import styles from './story-concept.module.css'

interface StoryConceptProps {
  story: StoryModule
  onContinue: () => void
}

export function StoryConcept({ story, onContinue }: StoryConceptProps) {
  return (
    <main className={styles.page}>
      <div className={styles.card}>
        <div className={styles.icon} aria-hidden="true">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="10" rx="2"/><circle cx="12" cy="5" r="4"/><line x1="8" y1="16" x2="8" y2="16"/><line x1="16" y1="16" x2="16" y2="16"/></svg>
        </div>
        <div className={styles.content}>
          <h2 className={styles.title}>What is this AI about?</h2>
          <p className={styles.text}>{story.aiDescription}</p>
        </div>
      </div>
      <button type="button" className={styles.continue} onClick={onContinue}>
        Continue
      </button>
    </main>
  )
}