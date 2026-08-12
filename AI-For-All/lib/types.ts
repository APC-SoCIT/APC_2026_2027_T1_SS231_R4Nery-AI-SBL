/**
 * lib/types.ts
 *
 * Shared domain types for the AI for ALL application.
 * See design document §4.3 for UserSession rationale.
 */

export type AIPath = 'creator' | 'explorer' | 'innovator'
export type Persona = 'guide' | 'challenger' | 'supporter'

export interface Badge {
  id: string
  label: string
  earnedAt: Date
}

export interface SessionProgress {
  moduleId: string
  sceneIndex: number
  choicesMade: string[]
}

/**
 * Client-side session shape — derived from the Supabase user object and
 * the `profiles` + `user_progress` rows.
 *
 * Always present for both anonymous guests and registered users:
 *   - userId       is the Supabase auth.users.id (real UUID even for guests)
 *   - isGuest      derived from user.is_anonymous
 *   - authMethod   derived from user.identities[0].provider (null for guests)
 */
export interface UserSession {
  sessionId: string
  userId: string
  isGuest: boolean
  authMethod: 'phone' | 'google' | null
  phoneVerified: boolean
  selectedPath?: AIPath
  selectedPersona?: Persona
  completedModules: string[]
  currentProgress?: SessionProgress
  totalPoints: number
  unlockedBadges: Badge[]
  claimedRewards: string[]
  createdAt: Date
  lastUpdatedAt: Date
}
