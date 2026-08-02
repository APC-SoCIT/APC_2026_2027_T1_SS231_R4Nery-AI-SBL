'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import styles from './landing.module.css';

export default function LandingPage() {
  const router = useRouter();
  const [showMore, setShowMore] = useState(false);

  return (
    <main className={styles.container}>
      <div className={styles.content}>
        <div className={styles.badge}>SM Booknook Exclusive</div>

        <div className={styles.hero}>
          <div className={styles.logo}>📚</div>
          <h1 className={styles.title}>AI for ALL</h1>
          <p className={styles.subtitle}>Explore AI Through Stories</p>
          <p className={styles.tagline}>Learn. Interact. Discover. AI.</p>
        </div>

        <div className={styles.features}>
          <div className={styles.feature}>
            <span className={styles.featureIcon}>📖</span>
            <span className={styles.featureText}>10+ Stories</span>
          </div>
          <div className={styles.feature}>
            <span className={styles.featureIcon}>🎁</span>
            <span className={styles.featureText}>Earn Rewards</span>
          </div>
          <div className={styles.feature}>
            <span className={styles.featureIcon}>👤</span>
            <span className={styles.featureText}>Free Access</span>
          </div>
        </div>

        <div className={styles.buttons}>
          <button className={styles.primaryBtn} onClick={() => router.push('/auth')}>
            Start Journey
          </button>
          <button className={styles.secondaryBtn} onClick={() => setShowMore(!showMore)}>
            Learn More
          </button>
        </div>

        {showMore && (
          <div className={styles.moreInfo}>
            <div className={styles.section}>
              <h2>About the Platform</h2>
              <p>
                AI for ALL is an interactive learning platform that makes artificial intelligence 
                accessible to everyone through engaging, story-based experiences.
              </p>
              <p>
                Located in SM Booknook kiosks across SM Supermalls in the Philippines, 
                we&apos;re bringing AI education to communities everywhere.
              </p>

              <div className={styles.infoCards}>
                <div className={styles.infoCard}>
                  <div className={styles.infoIcon}>🏢</div>
                  <h3>SM Booknook Partnership</h3>
                  <p>Available at interactive kiosks in SM Supermalls nationwide</p>
                </div>
                <div className={styles.infoCard}>
                  <div className={styles.infoIcon}>🎓</div>
                  <h3>Powered by IBM SkillsBuild</h3>
                  <p>Each story connects to free professional courses from IBM</p>
                </div>
                <div className={styles.infoCard}>
                  <div className={styles.infoIcon}>⏱️</div>
                  <h3>Learn at Your Pace</h3>
                  <p>Story-based learning designed for all ages and experience levels</p>
                </div>
              </div>
            </div>

            <div className={styles.section}>
              <h2>Our Mission</h2>
              <p>
                We believe AI education should be accessible, engaging, and empowering. 
                Through interactive stories and hands-on activities, we&apos;re democratizing 
                AI knowledge for learners of all backgrounds.
              </p>
            </div>
          </div>
        )}

        <p className={styles.footer}>Powered by IBM SkillsBuild</p>
      </div>
    </main>
  );
}
