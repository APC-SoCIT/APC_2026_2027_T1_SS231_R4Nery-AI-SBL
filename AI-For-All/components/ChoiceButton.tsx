'use client';

import React from 'react';
import styles from './ChoiceButton.module.css';

interface ChoiceButtonProps {
  text: string;
  onClick: () => void;
  disabled?: boolean;
  isCorrect?: boolean;
  showFeedback?: boolean;
  variant?: 'primary' | 'secondary';
}

export function ChoiceButton({
  text,
  onClick,
  disabled = false,
  isCorrect = false,
  showFeedback = false,
  variant = 'primary',
}: ChoiceButtonProps) {
  return (
    <button
      className={`${styles.button} ${styles[variant]} ${
        showFeedback ? (isCorrect ? styles.correctFeedback : styles.incorrectFeedback) : ''
      } ${disabled ? styles.disabled : ''}`}
      onClick={onClick}
      disabled={disabled}
      type="button"
      aria-pressed={showFeedback ? (isCorrect ? 'true' : 'false') : undefined}
    >
      <span className={styles.text}>{text}</span>
      {showFeedback && (
        <span className={styles.icon}>{isCorrect ? '✓' : '✗'}</span>
      )}
    </button>
  );
}
