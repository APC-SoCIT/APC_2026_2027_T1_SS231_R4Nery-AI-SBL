'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import styles from './admin-login.module.css';

export default function AdminLoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    // Mock login - in real app would verify credentials
    if (username && password) {
      router.push('/admin/dashboard');
    }
  };

  return (
    <main className={styles.container}>
      <div className={styles.card}>
        <h1 className={styles.title}>Admin Dashboard</h1>
        <p className={styles.subtitle}>AI for ALL - Administration</p>

        <form onSubmit={handleLogin} className={styles.form}>
          <div className={styles.formGroup}>
            <label htmlFor="username" className={styles.label}>
              Username
            </label>
            <input
              id="username"
              type="text"
              className={styles.input}
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Enter admin username"
              required
            />
          </div>

          <div className={styles.formGroup}>
            <label htmlFor="password" className={styles.label}>
              Password
            </label>
            <input
              id="password"
              type="password"
              className={styles.input}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter password"
              required
            />
          </div>

          <button type="submit" className={styles.submitBtn}>
            Log In →
          </button>
        </form>

        <p className={styles.hint}>
          Demo: Use any username and password to access the admin dashboard.
        </p>

        <a href="/" className={styles.backLink}>
          ← Back to Home
        </a>
      </div>
    </main>
  );
}
