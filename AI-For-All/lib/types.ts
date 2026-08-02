/* Type definitions for AI for ALL app */

export type Persona = 'avatar-1' | 'avatar-2' | 'avatar-3' | 'avatar-4';
export type AIPath = 'logical' | 'creative';

export interface Scene {
  id: string;
  dialogueText: string;
  characterExpression?: 'neutral' | 'happy' | 'encouraging' | 'thinking';
  backgroundImage?: string;
  microActivityType?: 'prompt-builder' | 'multiple-choice';
  microActivityContent?: {
    question: string;
    options: string[];
    correctIndex?: number;
  };
}

export interface Choice {
  id: string;
  text: string;
  nextSceneId?: string;
  nextModuleId?: string;
  isCorrectPath?: boolean;
  correctionText?: string;
}

export interface StoryModule {
  id: string;
  title: string;
  topic: string; // e.g., "Generative AI", "Machine Learning"
  description: string;
  scenes: Scene[];
  choices: Record<string, Choice[]>; // sceneId -> choices
  pointsReward: number;
  unlockedBadge?: {
    id: string;
    name: string;
    icon: string;
  };
  estimatedTime: number; // minutes
}

export interface Badge {
  id: string;
  name: string;
  description: string;
  icon: string;
  unlockedAt?: Date;
}

export interface Reward {
  id: string;
  name: string;
  description: string;
  pointsCost: number;
  icon: string;
  externalUrl?: string;
}

export interface SessionProgress {
  moduleId: string;
  sceneId: string;
  pointsEarned: number;
  completedAt?: Date;
}

export interface UserSession {
  sessionId: string;
  selectedPath?: AIPath;
  selectedPersona?: Persona;
  completedModules: string[];
  currentProgress?: SessionProgress;
  totalPoints: number;
  unlockedBadges: Badge[];
  claimedRewards: string[];
  createdAt: Date;
  lastUpdatedAt: Date;
}

export interface AnalyticsData {
  totalSessions: number;
  completionRate: number; // percentage
  averageSessionTime: number; // minutes
  bounceRate: number; // percentage
  mostPlayedModule: string;
  topReward: string;
}
