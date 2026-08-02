'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { Header } from '@/components/Header';
import { MOCK_STORY_MODULES } from '@/lib/storyData';
import styles from './admin-dashboard.module.css';

const MOCK_ANALYTICS = {
  totalSessions: 1245,
  completionRate: 68,
  averageSessionTime: 3.2,
  bounceRate: 12,
  mostPlayedModule: 'module-1',
  topReward: 'reward-1',
};

export default function AdminDashboardPage() {
  const router = useRouter();

  const handleLogout = () => {
    router.push('/');
  };

  return (
    <>
      <Header showHome={false} title="Admin Dashboard" />
      <main className={styles.container}>
        <div className={styles.content}>
          <div className={styles.header}>
            <h2>Welcome back, Admin</h2>
            <button className={styles.logoutBtn} onClick={handleLogout}>
              Logout
            </button>
          </div>

          {/* Analytics Section */}
          <section className={styles.section}>
            <h3 className={styles.sectionTitle}>Analytics</h3>
            <div className={styles.analyticsGrid}>
              <div className={styles.statCard}>
                <p className={styles.statLabel}>Total Sessions</p>
                <p className={styles.statValue}>{MOCK_ANALYTICS.totalSessions}</p>
              </div>
              <div className={styles.statCard}>
                <p className={styles.statLabel}>Completion Rate</p>
                <p className={styles.statValue}>{MOCK_ANALYTICS.completionRate}%</p>
              </div>
              <div className={styles.statCard}>
                <p className={styles.statLabel}>Avg Session Time</p>
                <p className={styles.statValue}>{MOCK_ANALYTICS.averageSessionTime}m</p>
              </div>
              <div className={styles.statCard}>
                <p className={styles.statLabel}>Bounce Rate</p>
                <p className={styles.statValue}>{MOCK_ANALYTICS.bounceRate}%</p>
              </div>
            </div>
          </section>

          {/* Content Management Section */}
          <section className={styles.section}>
            <h3 className={styles.sectionTitle}>Story Modules</h3>
            <div className={styles.tableContainer}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>Module</th>
                    <th>Topic</th>
                    <th>Scenes</th>
                    <th>Reward</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {MOCK_STORY_MODULES.map((module) => (
                    <tr key={module.id}>
                      <td>{module.title}</td>
                      <td>{module.topic}</td>
                      <td>{module.scenes.length}</td>
                      <td>{module.pointsReward} XP</td>
                      <td>
                        <div className={styles.actions}>
                          <button className={styles.editBtn}>Edit</button>
                          <button className={styles.deleteBtn}>Delete</button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          {/* Top Performers Section */}
          <section className={styles.section}>
            <h3 className={styles.sectionTitle}>Popular Items</h3>
            <div className={styles.performersGrid}>
              <div className={styles.performerCard}>
                <p className={styles.performerLabel}>Most Played Module</p>
                <p className={styles.performerValue}>
                  {MOCK_STORY_MODULES.find((m) => m.id === MOCK_ANALYTICS.mostPlayedModule)
                    ?.title || 'N/A'}
                </p>
                <p className={styles.performerMeta}>Preferred learning path</p>
              </div>
              <div className={styles.performerCard}>
                <p className={styles.performerLabel}>Top Claimed Reward</p>
                <p className={styles.performerValue}>SM Advantage Points</p>
                <p className={styles.performerMeta}>Most popular reward</p>
              </div>
            </div>
          </section>

          {/* Actions Section */}
          <section className={styles.section}>
            <h3 className={styles.sectionTitle}>Quick Actions</h3>
            <div className={styles.actionsGrid}>
              <button className={styles.actionBtn}>
                + Add New Module
              </button>
              <button className={styles.actionBtn}>
                Download Report
              </button>
              <button className={styles.actionBtn}>
                View User Data
              </button>
              <button className={styles.actionBtn}>
                System Settings
              </button>
            </div>
          </section>
        </div>
      </main>
    </>
  );
}
