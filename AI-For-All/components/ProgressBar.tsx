'use client';

import React from 'react';
import styles from './ProgressBar.module.css';

interface ProgressBarProps {
  current: number;
  total: number;
  label?: string;
  animated?: boolean;
}

export function ProgressBar({
  current,
  total,
  label,
  animated = true,
}: ProgressBarProps) {
  const percentage = Math.min((current / total) * 100, 100);

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <span className={styles.label}>
          {label || `Step ${current} of ${total}`}
        </span>
        <span className={styles.percentage}>
          {Math.round(percentage)}%
        </span>
      </div>
      <div className={styles.barContainer}>
        <div
          className={`${styles.bar} ${animated ? styles.animated : ''}`}
          style={{ width: `${percentage}%` }}
          role="progressbar"
          aria-valuenow={current}
          aria-valuemin={1}
          aria-valuemax={total}
          aria-label={label || `Progress: ${current} of ${total}`}
        />
      </div>
    </div>
  );
}
