'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from '@/lib/sessionContext';
import { Header } from '@/components/Header';
import SignupPrompt from '@/components/SignupPrompt';
import { MOCK_STORY_MODULES } from '@/lib/storyData';
import styles from './progress.module.css';

export default function ProgressPage() {
  const router = useRouter();
  const { session, startModule, auth } = useSession();
  const [showSignupPrompt, setShowSignupPrompt] = useState(auth.isGuest && session.completedModules.length === 1);

  const completedCount = session.completedModules.length;
  const totalModules = MOCK_STORY_MODULES.length;
  const completionPercentage = Math.round((completedCount / totalModules) * 100);

  // Get the next module if available
  const nextModule = MOCK_STORY_MODULES.find(
    (m) => !session.completedModules.includes(m.id),
  );

  const handleContinue = () => {
    if (nextModule) {
      startModule(nextModule.id);
      router.push(`/story/${nextModule.id}`);
    } else {
      // All modules complete - go to rewards
      router.push('/rewards');
    }
  };

  const handleRewards = () => {
    router.push('/rewards');
  };

  return (
    <>
      <SignupPrompt isOpen={showSignupPrompt} onClose={() => setShowSignupPrompt(false)} />
      <Header title="Module Complete! 🎉" showHome showPoints={session.totalPoints} />
      <main className={styles.container}>
        <div className={styles.content}>
          <div className={styles.celebration}>
            <p className={styles.celebrationText}>
              ✨ Excellent work! ✨
            </p>
          </div>

          <div className={styles.card}>
            <div className={styles.xpReward}>
              <span className={styles.xpIcon}>⭐</span>
              <div>
                <p className={styles.xpLabel}>Points Earned</p>
                <p className={styles.xpValue}>
                  +{MOCK_STORY_MODULES[session.completedModules.length - 1]?.pointsReward || 100}
                </p>
              </div>
            </div>
          </div>

          {session.unlockedBadges.length > 0 && (
            <div className={styles.badge}>
              <h3>Badge Unlocked!</h3>
              <div className={styles.badgeContent}>
                <span className={styles.badgeIcon}>
                  {session.unlockedBadges[session.unlockedBadges.length - 1]?.id === 'badge-1'
                    ? '🤖'
                    : session.unlockedBadges[session.unlockedBadges.length - 1]?.id === 'badge-2'
                      ? '🧠'
                      : '✨'}
                </span>
                <div>
                  <p className={styles.badgeName}>
                    {session.unlockedBadges[session.unlockedBadges.length - 1]?.name}
                  </p>
                </div>
              </div>
            </div>
          )}

          <div className={styles.progress}>
            <h3>Your Journey</h3>
            <div className={styles.progressBar}>
              <div
                className={styles.progressFill}
                style={{ width: `${completionPercentage}%` }}
              />
            </div>
            <p className={styles.progressText}>
              {completedCount} of {totalModules} modules completed ({completionPercentage}%)
            </p>
          </div>

          <div className={styles.buttons}>
            {nextModule && (
              <button className={styles.primaryBtn} onClick={handleContinue}>
                Next Module: {nextModule.title} →
              </button>
            )}

            {completedCount === totalModules && (
              <div className={styles.completionMessage}>
                🏆 Congratulations! You&apos;ve completed all modules!
              </div>
            )}

            <button className={styles.secondaryBtn} onClick={handleRewards}>
              {completedCount === totalModules ? 'Claim Rewards' : 'View Rewards'}
            </button>
          </div>

          <a
            href="https://www.ibm.com/skills"
            target="_blank"
            rel="noopener noreferrer"
            className={styles.externalLink}
          >
            Explore IBM SkillsBuild →
          </a>
        </div>
      </main>
    </>
  );
}
