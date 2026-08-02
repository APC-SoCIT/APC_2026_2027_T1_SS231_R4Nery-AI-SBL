'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from '@/lib/sessionContext';
import styles from './SignupPrompt.module.css';

interface SignupPromptProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function SignupPrompt({ isOpen, onClose }: SignupPromptProps) {
  const router = useRouter();
  const { loginUser } = useSession();

  if (!isOpen) return null;

  const handleSignup = () => {
    router.push('/auth?signup=true');
  };

  const handleGoogleSignup = () => {
    // Mock Google signup
    loginUser('user@google.com', 'User');
    router.push('/persona-selection');
    onClose();
  };

  return (
    <div className={styles.overlay}>
      <div className={styles.modal}>
        <button className={styles.closeBtn} onClick={onClose}>
          ✕
        </button>

        <div className={styles.content}>
          <div className={styles.icon}>🎉</div>
          <h2 className={styles.title}>Great Job!</h2>
          <p className={styles.description}>
            You&apos;ve completed your first story! Create a free account to save your
            progress, unlock more stories, and earn exclusive rewards.
          </p>

          <div className={styles.buttons}>
            <button className={styles.primaryBtn} onClick={handleSignup}>
              Create Free Account →
            </button>

            <button className={styles.googleBtn} onClick={handleGoogleSignup}>
              <span>🔵</span> Sign Up with Google
            </button>

            <button className={styles.continueBtn} onClick={onClose}>
              Continue as Guest
            </button>
          </div>

          <p className={styles.hint}>
            You can create an account anytime. All your progress will be saved.
          </p>
        </div>
      </div>
    </div>
  );
}
