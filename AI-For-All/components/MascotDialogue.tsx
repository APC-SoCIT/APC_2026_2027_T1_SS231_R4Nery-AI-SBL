'use client';

import React from 'react';
import styles from './MascotDialogue.module.css';

interface MascotDialogueProps {
  text: string;
  expression?: 'neutral' | 'happy' | 'encouraging' | 'thinking';
  avatarEmoji?: string;
}

export function MascotDialogue({
  text,
  expression = 'neutral',
  avatarEmoji = '🤖',
}: MascotDialogueProps) {
  return (
    <div className={styles.container}>
      <div className={styles.mascot}>
        <div className={`${styles.avatar} ${styles[`expression-${expression}`]}`}>
          {avatarEmoji}
        </div>
      </div>
      <div className={styles.dialogue}>
        <div className={styles.bubble}>
          <p>{text}</p>
        </div>
      </div>
    </div>
  );
}
