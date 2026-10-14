/**
 * lib/topics.ts
 *
 * Single source of truth for Goalboard topic names and their colors.
 * Used by the interest picker, goalboard admin page, and story editor.
 */

export const TOPIC_COLORS: Record<string, string> = {
  'AI Concepts':            '#818cf8',
  'Smart Helpers':          '#38bdf8',
  'Creative Thinking':      '#fb923c',
  'Fairness in Technology': '#4ade80',
  'Rate Limiting':          '#f87171',
  'Prompt Engineering':     '#fbbf24',
  'Ethics in AI':           '#a78bfa',
  'Machine Learning':       '#34d399',
  'Data & Privacy':         '#60a5fa',
  'Robotics':               '#f472b6',
}

/** Ordered list of all preset topics. */
export const PRESET_TOPICS: string[] = Object.keys(TOPIC_COLORS)

/** Returns the hex color for a topic, or a default grey. */
export function topicColor(t: string): string {
  return TOPIC_COLORS[t] ?? '#94a3b8'
}

/** Maximum number of interests a user can pick. */
export const MAX_INTERESTS = 3
