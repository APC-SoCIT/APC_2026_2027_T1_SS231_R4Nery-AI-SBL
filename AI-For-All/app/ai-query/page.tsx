'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from '@/lib/sessionContext';
import { Header } from '@/components/Header';
import { MascotDialogue } from '@/components/MascotDialogue';
import styles from './ai-query.module.css';

export default function AIQueryPage() {
  const router = useRouter();
  const { session } = useSession();
  const [question, setQuestion] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const getPersonaEmoji = () => {
    switch (session.selectedPersona) {
      case 'avatar-1':
        return '🧙';
      case 'avatar-2':
        return '⚔️';
      case 'avatar-3':
        return '🐉';
      case 'avatar-4':
        return '🧝';
      default:
        return '🤖';
    }
  };

  const getPersonaName = () => {
    switch (session.selectedPersona) {
      case 'avatar-1':
        return 'Tech Sage';
      case 'avatar-2':
        return 'Quantum Knight';
      case 'avatar-3':
        return "Data Dragon";
      case 'avatar-4':
        return 'Pixel Elf';
      default:
        return 'AI Helper';
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!question.trim()) return;

    setIsLoading(true);

    try {
      // Route to processing page with the question
      router.push(`/ai-processing?q=${encodeURIComponent(question)}`);
    } catch (error) {
      console.error('[v0] Error submitting question:', error);
      setIsLoading(false);
    }
  };

  const handleBackButton = () => {
    router.push('/progress');
  };

  return (
    <>
      <Header 
        title="Ask Your Question" 
        showHome 
        showPoints={session.totalPoints}
        showBack
        onBack={handleBackButton}
      />
      <main className={styles.container}>
        <div className={styles.content}>
          <div className={styles.progressBar}>
            <div className={styles.progress} style={{ width: '33%' }}></div>
          </div>

          <div className={styles.mascot}>
            <div className={styles.emoji}>{getPersonaEmoji()}</div>
          </div>

          <div className={styles.dialogueBox}>
            <p className={styles.greeting}>
              Now it&apos;s <strong>YOUR</strong> turn to meet the magical {getPersonaName()}!
            </p>
            <p className={styles.instruction}>
              Think of any mystery you want solved - why is the sky blue? How do planes fly? Ask your question below, and watch as the AI helper works its magic to answer you!
            </p>
          </div>

          <form onSubmit={handleSubmit} className={styles.form}>
            <label className={styles.label}>
              What would you like to learn about?
            </label>
            <textarea
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              placeholder="Example: How do airplanes fly?"
              className={styles.textarea}
              rows={4}
              disabled={isLoading}
            />
            <button
              type="submit"
              className={styles.submitButton}
              disabled={!question.trim() || isLoading}
            >
              {isLoading ? 'Processing...' : 'Ask AI'}
            </button>
          </form>
        </div>
      </main>
    </>
  );
}
