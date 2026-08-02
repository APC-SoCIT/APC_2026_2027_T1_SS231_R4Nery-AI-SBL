'use client';

import React from 'react';
import Link from 'next/link';
import styles from './Header.module.css';

interface HeaderProps {
  title?: string;
  showHome?: boolean;
  showPoints?: number;
}

export function Header({ title, showHome = true, showPoints }: HeaderProps) {
  return (
    <header className={styles.header}>
      <div className={styles.container}>
        <div className={styles.left}>
          {showHome && (
            <Link href="/" className={styles.homeLink}>
              🏠 Home
            </Link>
          )}
        </div>

        {title && <h1 className={styles.title}>{title}</h1>}

        {showPoints !== undefined && (
          <div className={styles.points}>
            <span className={styles.pointsIcon}>⭐</span>
            <span className={styles.pointsValue}>{showPoints} XP</span>
          </div>
        )}
      </div>
    </header>
  );
}
