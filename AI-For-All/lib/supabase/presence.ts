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
export function getStoryPresenceCount(storyId: string): Promise<number> {
  return new Promise((resolve) => {
    const supabase = createClient()
    const channelName = storyChannelName(storyId) // ← SAME channel name

    const probeKey = `probe-${Date.now()}`

    const channel: RealtimeChannel = supabase.channel(channelName, {
      config: { presence: { key: probeKey } },
    })

    let resolved = false

    channel
      .on('presence', { event: 'sync' }, () => {
        if (resolved) return
        resolved = true
        const state = channel.presenceState()
        let count = 0
        for (const key of Object.keys(state)) {
          const presences = state[key] as any[]
          if (presences && presences.some((p: any) => p.role === 'learner')) {
            count++
          }
        }
        supabase.removeChannel(channel)
        resolve(count)
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          await channel.track({ role: 'probe', probeKey })
        }
      })

    // Fallback timeout — if no sync event fires within 3s, assume 0
    setTimeout(() => {
      if (!resolved) {
        resolved = true
        supabase.removeChannel(channel)
        resolve(0)
      }
    }, 3000)
  })
}
