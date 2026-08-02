'use client';

import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { UserSession, Persona, Badge, SessionProgress, AIPath } from './types';
import { MOCK_STORY_MODULES } from './storyData';

interface SessionContextType {
  session: UserSession;
  auth: {
    isLoggedIn: boolean;
    isGuest: boolean;
    user?: { email: string; name: string };
  };
  selectPath: (path: AIPath) => void;
  selectPersona: (persona: Persona) => void;
  startModule: (moduleId: string) => void;
  completeModule: (moduleId: string, pointsEarned: number, badge?: Badge) => void;
  updateProgress: (progress: SessionProgress) => void;
  claimReward: (rewardId: string) => void;
  playAsGuest: () => void;
  loginUser: (email: string, name: string) => void;
  logout: () => void;
  resetSession: () => void;
}

const SessionContext = createContext<SessionContextType | undefined>(undefined);

const INITIAL_SESSION: UserSession = {
  sessionId: `session-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
  selectedPersona: undefined,
  completedModules: [],
  currentProgress: undefined,
  totalPoints: 0,
  unlockedBadges: [],
  claimedRewards: [],
  createdAt: new Date(),
  lastUpdatedAt: new Date(),
};

export function SessionProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<UserSession>(INITIAL_SESSION);
  const [auth, setAuth] = useState({
    isLoggedIn: false,
    isGuest: false,
    user: undefined as { email: string; name: string } | undefined,
  });

  const selectPath = useCallback((path: AIPath) => {
    setSession((prev) => ({
      ...prev,
      selectedPath: path,
      lastUpdatedAt: new Date(),
    }));
  }, []);

  const selectPersona = useCallback((persona: Persona) => {
    setSession((prev) => ({
      ...prev,
      selectedPersona: persona,
      lastUpdatedAt: new Date(),
    }));
  }, []);

  const startModule = useCallback((moduleId: string) => {
    const module = MOCK_STORY_MODULES.find((m) => m.id === moduleId);
    if (!module) return;

    const firstScene = module.scenes[0];
    setSession((prev) => ({
      ...prev,
      currentProgress: {
        moduleId,
        sceneId: firstScene.id,
        pointsEarned: 0,
      },
      lastUpdatedAt: new Date(),
    }));
  }, []);

  const completeModule = useCallback((moduleId: string, pointsEarned: number, badge?: Badge) => {
    setSession((prev) => {
      const updatedBadges = badge ? [...prev.unlockedBadges, badge] : prev.unlockedBadges;
      return {
        ...prev,
        completedModules: [...new Set([...prev.completedModules, moduleId])],
        totalPoints: prev.totalPoints + pointsEarned,
        unlockedBadges: updatedBadges,
        currentProgress: undefined,
        lastUpdatedAt: new Date(),
      };
    });
  }, []);

  const updateProgress = useCallback((progress: SessionProgress) => {
    setSession((prev) => ({
      ...prev,
      currentProgress: progress,
      lastUpdatedAt: new Date(),
    }));
  }, []);

  const claimReward = useCallback((rewardId: string) => {
    setSession((prev) => ({
      ...prev,
      claimedRewards: [...prev.claimedRewards, rewardId],
      lastUpdatedAt: new Date(),
    }));
  }, []);

  const playAsGuest = useCallback(() => {
    setAuth({
      isLoggedIn: false,
      isGuest: true,
      user: undefined,
    });
    setSession(INITIAL_SESSION);
  }, []);

  const loginUser = useCallback((email: string, name: string) => {
    setAuth({
      isLoggedIn: true,
      isGuest: false,
      user: { email, name },
    });
  }, []);

  const logout = useCallback(() => {
    setAuth({
      isLoggedIn: false,
      isGuest: false,
      user: undefined,
    });
    setSession(INITIAL_SESSION);
  }, []);

  const resetSession = useCallback(() => {
    setSession(INITIAL_SESSION);
  }, []);

  return (
    <SessionContext.Provider
      value={{
        session,
        auth,
        selectPath,
        selectPersona,
        startModule,
        completeModule,
        updateProgress,
        claimReward,
        playAsGuest,
        loginUser,
        logout,
        resetSession,
      }}
    >
      {children}
    </SessionContext.Provider>
  );
}

export function useSession(): SessionContextType {
  const context = useContext(SessionContext);
  if (!context) {
    throw new Error('useSession must be used within a SessionProvider');
  }
  return context;
}
