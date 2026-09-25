/**
 * lib/reactions.ts
 *
 * Reaction options shown on the Story Reaction ("Check-in time") screen.
 *
 * `value` is what gets stored in public.story_reactions.reaction and must
 * stay in sync with the CHECK constraint in supabase-story-reactions.sql.
 * `label` is display text only (the soft hyphen lets "Overwhelmed" wrap).
 */
export const STORY_REACTIONS = [
  { value: 'hooked', label: 'Hooked' },
  { value: 'enjoying', label: 'Enjoying' },
  { value: 'curious', label: 'Curious' },
  { value: 'learning', label: 'Learning' },
  { value: 'neutral', label: 'Neutral' },
  { value: 'unsure', label: 'Unsure' },
  { value: 'confused', label: 'Confused' },
  { value: 'slow', label: 'Slow' },
  { value: 'bored', label: 'Bored' },
  { value: 'overwhelmed', label: 'Over\u00ADwhelmed' },
  { value: 'losing_interest', label: 'Losing Interest' },
  { value: 'try_another', label: 'Try Another' },
] as const

export type StoryReactionValue = (typeof STORY_REACTIONS)[number]['value']

export function isStoryReactionValue(value: unknown): value is StoryReactionValue {
  return typeof value === 'string' && STORY_REACTIONS.some((r) => r.value === value)
}