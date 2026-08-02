'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from '@/lib/sessionContext';
import { PATH_DETAILS } from '@/lib/pathConfig';
import { AIPath } from '@/lib/types';
import { Header } from '@/components/Header';
import styles from './path-selection.module.css';

export default function PathSelectionPage() {
  const router = useRouter();
  const { selectPath } = useSession();
  const [selected, setSelected] = useState<AIPath | null>(null);

  const handleConfirm = () => {
    if (selected) {
      selectPath(selected);
      router.push('/persona-selection');
    }
  };

  return (
    <>
      <Header showHome />
      <main className={styles.container}>
        <div className={styles.content}>
          <h1 className={styles.title}>Choose Your Path</h1>
          <p className={styles.subtitle}>What would you say about AI?</p>

          <div className={styles.pathsContainer}>
            {Object.entries(PATH_DETAILS).map(([pathId, pathInfo]) => {
              const path = pathId as AIPath;
              return (
                <button
                  key={path}
                  className={`${styles.pathCard} ${
                    selected === path ? styles.selected : ''
                  }`}
                  onClick={() => setSelected(path)}
                  type="button"
                >
                  <div className={styles.icon}>{pathInfo.icon}</div>
                  <h2 className={styles.pathTitle}>{pathInfo.title}</h2>
                  <p className={styles.pathDescription}>{pathInfo.description}</p>
                </button>
              );
            })}
          </div>

          {selected && (
            <button
              className={styles.continueBtn}
              onClick={handleConfirm}
              type="button"
            >
              Continue
            </button>
          )}

          {!selected && (
            <button
              className={styles.continueBtn}
              disabled
              type="button"
            >
              Continue
            </button>
          )}
        </div>
      </main>
    </>
  );
}
