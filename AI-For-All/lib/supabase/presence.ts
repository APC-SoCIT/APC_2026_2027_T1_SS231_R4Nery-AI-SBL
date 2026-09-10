import { createClient } from './client'
import type { RealtimeChannel } from '@supabase/supabase-js'

/**
 * Generate a random anonymous session ID for presence tracking.
 * Persisted in sessionStorage so it stays consistent across page navigations
 * within the same browser tab/session.
 */
function getSessionId(): string {
  if (typeof window === 'undefined') return 'server'
  const KEY = 'ai-for-all:presence-id'
  let id = sessionStorage.getItem(KEY)
  if (!id) {
    id = `anon-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
    sessionStorage.setItem(KEY, id)
  }
  return id
}

/**
 * The canonical channel name for a story's presence room.
 * ALL clients (learners AND admins) MUST use this exact same name
 * so that Supabase Realtime groups them in the same room.
 */
function storyChannelName(storyId: string): string {
  return `story-presence:${storyId}`
}

/**
 * Track presence on a story channel.
 * Call when a learner opens / starts playing a story.
 * Returns a cleanup function to call on unmount.
 */
export function trackStoryPresence(storyId: string): () => void {
  const supabase = createClient()
  const channelName = storyChannelName(storyId)
  const sessionId = getSessionId()

  const channel: RealtimeChannel = supabase.channel(channelName, {
    config: { presence: { key: sessionId } },
  })

  channel
    .on('presence', { event: 'sync' }, () => {
      // No-op on the learner side — we just need to be present
    })
    .subscribe(async (status) => {
      if (status === 'SUBSCRIBED') {
        await channel.track({
          sessionId,
          role: 'learner',
          joinedAt: new Date().toISOString(),
        })
      }
    })

  return () => {
    channel.untrack()
    supabase.removeChannel(channel)
  }
}

/**
 * Subscribe to live presence updates for a specific story.
 * Joins the SAME channel room as learners so it can see their presence.
 * The admin tracks itself with role: 'admin' so it can be filtered out of counts.
 * Calls `callback` with the current active learner count whenever presence changes.
 * Returns an unsubscribe function.
 */
export function subscribeToStoryPresence(
  storyId: string,
  callback: (count: number) => void,
): () => void {
  const supabase = createClient()
  const channelName = storyChannelName(storyId) // ← SAME channel name as learner

  const adminKey = `admin-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`

  const channel: RealtimeChannel = supabase.channel(channelName, {
    config: { presence: { key: adminKey } },
  })

  function countLearners() {
    const state = channel.presenceState()
    let count = 0
    for (const key of Object.keys(state)) {
      const presences = state[key] as any[]
      // Only count non-admin presences
      if (presences && presences.some((p: any) => p.role !== 'admin')) {
        count++
      }
    }
    callback(count)
  }

  channel
    .on('presence', { event: 'sync' }, countLearners)
    .on('presence', { event: 'join' }, countLearners)
    .on('presence', { event: 'leave' }, countLearners)
    .subscribe(async (status) => {
      if (status === 'SUBSCRIBED') {
        // Track as admin so we appear in the room but get filtered out of counts
        await channel.track({ role: 'admin', adminKey })
        // Initial count after joining
        setTimeout(countLearners, 500)
      }
    })

  return () => {
    channel.untrack()
    supabase.removeChannel(channel)
  }
}

/**
 * One-shot: get the current number of learner users on a story.
 * Joins the SAME channel, waits for presence sync, counts, then leaves.
 */
function countLearnersInState(state: ReturnType<RealtimeChannel['presenceState']>): number {
  let count = 0
  for (const key of Object.keys(state)) {
    const presences = state[key] as any[]
    if (presences && presences.some((p: any) => p.role === 'learner')) {
      count++
    }
  }
  return count
}

/**
 * One-shot: get the current number of learner users on a story.
 *
 * Strategy:
 *  1. If the Supabase client already has a subscribed channel for this story
 *     (e.g. from `subscribeToStoryPresence` running on the admin page), read
 *     its presenceState() directly — no new subscription needed and no risk of
 *     "cannot add callbacks after subscribe()" errors.
 *  2. Otherwise, open a brand-new uniquely-named probe channel, wait for the
 *     first sync event, then clean it up.
 */
export function getStoryPresenceCount(storyId: string): Promise<number> {
  return new Promise((resolve) => {
    const supabase = createClient()
    const channelName = storyChannelName(storyId)
    const internalTopic = `realtime:${channelName}`

    // ── Strategy 1: reuse an already-subscribed channel ──────────────────────
    // supabase.channel() is a singleton registry keyed on channel name.
    // If the admin page already called subscribeToStoryPresence(), that channel
    // is already subscribed; calling .on() on it again throws the error above.
    // Instead, find it via getChannels() and read its state directly.
    const existing = supabase.getChannels().find(
      (ch) => ch.topic === internalTopic
    )
    if (existing) {
      resolve(countLearnersInState(existing.presenceState()))
      return
    }

    // ── Strategy 2: open a fresh probe channel ────────────────────────────────
    // Use a unique channel name (including a timestamp) so it never collides
    // with any existing channel in the client's registry.
    const probeKey = `probe-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`
    const probeChannelName = `${channelName}:${probeKey}`

    const channel: RealtimeChannel = supabase.channel(probeChannelName, {
      config: { presence: { key: probeKey } },
    })

    let resolved = false

    const finish = (count: number) => {
      if (resolved) return
      resolved = true
      supabase.removeChannel(channel)
      resolve(count)
    }

    channel
      .on('presence', { event: 'sync' }, () => {
        finish(countLearnersInState(channel.presenceState()))
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          await channel.track({ role: 'probe', probeKey })
        }
      })

    // Fallback timeout — if no sync event fires within 3 s, assume 0
    setTimeout(() => finish(0), 3000)
  })
}
