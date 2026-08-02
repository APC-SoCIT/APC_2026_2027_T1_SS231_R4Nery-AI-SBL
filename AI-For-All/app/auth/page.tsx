'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from '@/lib/sessionContext';
import styles from './auth.module.css';

export default function AuthPage() {
  const router = useRouter();
  const { playAsGuest, loginUser } = useSession();
  const [showLogin, setShowLogin] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [isSignup, setIsSignup] = useState(false);
  const [error, setError] = useState('');

  const handlePlayAsGuest = () => {
    playAsGuest();
    router.push('/path-selection');
  };

  const handleGoogleAuth = () => {
    // Mock Google authentication
    const mockName = isSignup ? name : 'User';
    loginUser(email || 'user@google.com', mockName);
    router.push('/path-selection');
  };

  const handleEmailAuth = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!email) {
      setError('Email is required');
      return;
    }

    if (isSignup) {
      if (!name) {
        setError('Name is required');
        return;
      }
      if (!password) {
        setError('Password is required');
        return;
      }
      if (password.length < 6) {
        setError('Password must be at least 6 characters');
        return;
      }
      loginUser(email, name);
    } else {
      if (!password) {
        setError('Password is required');
        return;
      }
      // Mock login - in real app would verify credentials
      loginUser(email, 'User');
    }

    router.push('/path-selection');
  };

  return (
    <main className={styles.container}>
      <div className={styles.card}>
        <button className={styles.backBtn} onClick={() => router.push('/')}>
          ← Back
        </button>

        {!showLogin ? (
          <>
            <h1 className={styles.title}>Welcome to AI for ALL</h1>
            <p className={styles.subtitle}>Choose how you want to start learning</p>

            <div className={styles.options}>
              <button className={styles.primaryOption} onClick={handlePlayAsGuest}>
                <span className={styles.optionIcon}>🚀</span>
                <span className={styles.optionTitle}>Play as Guest</span>
                <span className={styles.optionDesc}>
                  Try one story and create an account when ready
                </span>
              </button>

              <button
                className={styles.secondaryOption}
                onClick={() => setShowLogin(true)}
              >
                <span className={styles.optionIcon}>🔐</span>
                <span className={styles.optionTitle}>Log In / Sign Up</span>
                <span className={styles.optionDesc}>
                  Create an account to save your progress and earn rewards
                </span>
              </button>
            </div>
          </>
        ) : (
          <>
            <h1 className={styles.title}>
              {isSignup ? 'Create Account' : 'Log In'}
            </h1>
            <p className={styles.subtitle}>
              {isSignup
                ? 'Get started with your free account'
                : 'Welcome back!'}
            </p>

            {error && <div className={styles.error}>{error}</div>}

            <form onSubmit={handleEmailAuth} className={styles.form}>
              {isSignup && (
                <div className={styles.formGroup}>
                  <label htmlFor="name" className={styles.label}>
                    Full Name
                  </label>
                  <input
                    id="name"
                    type="text"
                    className={styles.input}
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Enter your name"
                  />
                </div>
              )}

              <div className={styles.formGroup}>
                <label htmlFor="email" className={styles.label}>
                  Email
                </label>
                <input
                  id="email"
                  type="email"
                  className={styles.input}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Enter your email"
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
                  placeholder="Enter your password"
                />
              </div>

              <button type="submit" className={styles.submitBtn}>
                {isSignup ? 'Create Account' : 'Log In'} →
              </button>
            </form>

            <div className={styles.divider}>
              <span>or</span>
            </div>

            <button className={styles.googleBtn} onClick={handleGoogleAuth}>
              <span className={styles.googleIcon}>🔵</span>
              {isSignup ? 'Sign Up with Google' : 'Log In with Google'}
            </button>

            <div className={styles.toggle}>
              {isSignup ? (
                <>
                  Already have an account?{' '}
                  <button
                    type="button"
                    className={styles.toggleBtn}
                    onClick={() => {
                      setIsSignup(false);
                      setError('');
                      setName('');
                    }}
                  >
                    Log In
                  </button>
                </>
              ) : (
                <>
                  Don&apos;t have an account?{' '}
                  <button
                    type="button"
                    className={styles.toggleBtn}
                    onClick={() => {
                      setIsSignup(true);
                      setError('');
                    }}
                  >
                    Sign Up
                  </button>
                </>
              )}
            </div>

            <button
              className={styles.backToOptions}
              onClick={() => {
                setShowLogin(false);
                setError('');
                setEmail('');
                setPassword('');
                setName('');
                setIsSignup(false);
              }}
            >
              ← Back to options
            </button>
          </>
        )}
      </div>
    </main>
  );
}
