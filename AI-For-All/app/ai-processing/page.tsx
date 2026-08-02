'use client';

import React, { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useSession } from '@/lib/sessionContext';
import styles from './ai-processing.module.css';

export default function AIProcessingPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { session } = useSession();
  const [isComplete, setIsComplete] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const question = searchParams.get('q') || '';

  useEffect(() => {
    if (!question) {
      router.push('/ai-query');
      return;
    }

    // Simulate AI processing steps
    const steps = [
      { duration: 800, step: 'reading' },
      { duration: 1600, step: 'understanding' },
      { duration: 2400, step: 'generating' },
      { duration: 3200, step: 'ready' },
    ];

    steps.forEach(({ duration, step }) => {
      setTimeout(() => {
        if (document.querySelector(`[data-step="${step}"]`)) {
          const stepEl = document.querySelector(`[data-step="${step}"]`);
          if (stepEl) {
            stepEl.classList.add(styles.completed);
          }
        }
      }, duration);
    });

    // After all steps, show completion badge and route to response
    const completeTimer = setTimeout(() => {
      setIsComplete(true);
      // Route to response page after 1 second
      setTimeout(() => {
        router.push(`/ai-response?q=${encodeURIComponent(question)}`);
      }, 1000);
    }, 3500);

    return () => clearTimeout(completeTimer);
  }, [question, router]);

  return (
    <main className={styles.container}>
      <div className={styles.content}>
        <h1 className={styles.title}>AI is Processing...</h1>
        <p className={styles.subtitle}>
          Watch how AI understands your question
        </p>

        <div className={styles.questionBox}>
          <span className={styles.questionLabel}>Your question:</span>
          <p className={styles.question}>"{question}"</p>
        </div>

        <div className={styles.stepsContainer}>
          <div className={styles.step} data-step="reading">
            <div className={styles.stepIcon}>
              <span className={styles.icon}>🔍</span>
            </div>
            <div className={styles.stepContent}>
              <h3 className={styles.stepTitle}>Reading your question</h3>
              <div className={styles.progressBar}>
                <div className={`${styles.fill} ${styles.reading}`}></div>
              </div>
            </div>
          </div>

          <div className={styles.step} data-step="understanding">
            <div className={styles.stepIcon}>
              <span className={styles.icon}>🧠</span>
            </div>
            <div className={styles.stepContent}>
              <h3 className={styles.stepTitle}>Understanding context</h3>
              <div className={styles.progressBar}>
                <div className={`${styles.fill} ${styles.understanding}`}></div>
              </div>
            </div>
          </div>

          <div className={styles.step} data-step="generating">
            <div className={styles.stepIcon}>
              <span className={styles.icon}>💡</span>
            </div>
            <div className={styles.stepContent}>
              <h3 className={styles.stepTitle}>Generating response</h3>
              <div className={styles.progressBar}>
                <div className={`${styles.fill} ${styles.generating}`}></div>
              </div>
            </div>
          </div>

          <div className={styles.step} data-step="ready">
            <div className={styles.stepIcon}>
              <span className={styles.icon}>✓</span>
            </div>
            <div className={styles.stepContent}>
              <h3 className={styles.stepTitle}>Ready!</h3>
              <div className={styles.progressBar}>
                <div className={`${styles.fill} ${styles.ready}`}></div>
              </div>
            </div>
          </div>
        </div>

        {isComplete && (
          <div className={styles.completionBadge}>
            <span className={styles.checkmark}>✓</span>
            <span>Processing Complete!</span>
          </div>
        )}
      </div>
    </main>
  );
}
