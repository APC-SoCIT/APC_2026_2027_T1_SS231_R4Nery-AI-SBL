/**
 * lib/supabase/metrics.ts
 *
 * Data access and aggregation for:
 * 1. Story Reaction Metrics: registered learners vs guest counts per story & overall
 * 2. IBM SkillsBuild Handoff Metrics: clicks, completers/reactors, and CTR percentage
 */
import { adminClient } from './admin'
import { STORY_REACTIONS, StoryReactionValue } from '../reactions'

export interface StoryReactionBreakdown {
  reaction: StoryReactionValue
  label: string
  registered: number
  guests: number
  total: number
}

export interface StoryMetricItem {
  id: string
  title: string
  category: string
  status: string
  // Reaction stats
  registeredReactors: number
  guestReactors: number
  totalReactors: number
  reactionsByType: Record<string, StoryReactionBreakdown>
  topReaction?: { label: string; count: number; value: string }
  // IBM Handoff link stats
  skillsBuildUrl: string
  skillsBuildButtonText: string
  hasHandoffLink: boolean
  totalClicks: number
  registeredClicks: number
  guestClicks: number
  clickPercentage: number // e.g. 45.5 (%)
}

export interface RegisteredLearnerReaction {
  storyId: string
  storyTitle: string
  userId: string
  learnerName: string
  reaction: string
  createdAt: string
  updatedAt: string
}

export interface OverallMetricsSummary {
  totalStories: number
  storiesWithHandoff: number
  totalReactions: number
  totalRegisteredReactions: number
  totalGuestReactions: number
  uniqueRegisteredReactors: number
  totalHandoffClicks: number
  registeredHandoffClicks: number
  guestHandoffClicks: number
  overallHandoffCTR: number // %
  migrationNeeded: boolean
}

export interface StoryMetricsResponse {
  summary: OverallMetricsSummary
  stories: StoryMetricItem[]
  registeredLearnerReactions: RegisteredLearnerReaction[]
}

/**
 * Fetch unified reaction and IBM handoff metrics from Supabase.
 */
export async function fetchStoryMetrics(): Promise<StoryMetricsResponse> {
  const supabase = adminClient()

  // ── 1. Fetch stories ────────────────────────────────────────────────────────
  const { data: storiesData, error: storiesErr } = await supabase
    .from('stories')
    .select('id, title, category, status, skills_build_url, skills_build_button_text')
    .order('title', { ascending: true })

  const rawStories = storiesData || []

  // ── 2. Fetch registered reactions ───────────────────────────────────────────
  const { data: regReactionsData } = await supabase
    .from('story_reactions')
    .select('reaction_id, story_id, user_id, reaction, created_at, updated_at')

  const regReactions = regReactionsData || []

  // ── 3. Fetch guest reaction counts ──────────────────────────────────────────
  const { data: guestCountsData } = await supabase
    .from('story_reaction_guest_counts')
    .select('story_id, reaction, guest_count, updated_at')

  const guestCounts = guestCountsData || []

  // ── 4. Fetch registered learner info (from view if available, or join users) ──
  let registeredLearners: RegisteredLearnerReaction[] = []
  try {
    const { data: regViewData, error: regViewErr } = await supabase
      .from('story_reactions_registered')
      .select('story_id, story_title, user_id, learner_name, reaction, created_at, updated_at')
      .order('created_at', { ascending: false })
      .limit(50)

    if (!regViewErr && regViewData) {
      registeredLearners = regViewData.map((r: any) => ({
        storyId: r.story_id,
        storyTitle: r.story_title || r.story_id,
        userId: r.user_id,
        learnerName: r.learner_name || 'Learner',
        reaction: r.reaction,
        createdAt: r.created_at,
        updatedAt: r.updated_at,
      }))
    } else {
      // Fallback: join with users table
      const userIds = Array.from(new Set(regReactions.map((r: any) => r.user_id)))
      const { data: usersData } = await supabase
        .from('users')
        .select('user_id, username, user_sname')
        .in('user_id', userIds)

      const userMap = new Map<string, string>()
      usersData?.forEach((u: any) => {
        const name = [u.username, u.user_sname].filter(Boolean).join(' ') || 'Learner'
        userMap.set(u.user_id, name)
      })

      registeredLearners = regReactions.map((r: any) => ({
        storyId: r.story_id,
        storyTitle: rawStories.find((s: any) => s.id === r.story_id)?.title || r.story_id,
        userId: r.user_id,
        learnerName: userMap.get(r.user_id) || 'Learner',
        reaction: r.reaction,
        createdAt: r.created_at,
        updatedAt: r.updated_at,
      }))
    }
  } catch {
    registeredLearners = []
  }

  // ── 5. Fetch IBM Handoff link clicks ─────────────────────────────────────────
  let handoffClicks: any[] = []
  let migrationNeeded = false
  try {
    const { data: clicksData, error: clicksErr } = await supabase
      .from('story_handoff_clicks')
      .select('click_id, story_id, user_id, is_guest, clicked_at')

    if (clicksErr) {
      // Table doesn't exist yet
      if (clicksErr.code === 'PGRST205' || clicksErr.message?.includes('schema cache')) {
        migrationNeeded = true
      }
    } else if (clicksData) {
      handoffClicks = clicksData
    }
  } catch {
    migrationNeeded = true
  }

  // ── 6. Aggregate metrics per story ──────────────────────────────────────────
  const storyItems: StoryMetricItem[] = rawStories.map((story: any) => {
    const storyId = story.id
    const hasHandoffLink = Boolean(story.skills_build_url && story.skills_build_url.trim() !== '')

    // Reactions
    const thisStoryRegReactions = regReactions.filter((r: any) => r.story_id === storyId)
    const thisStoryGuestCounts = guestCounts.filter((g: any) => g.story_id === storyId)

    const registeredReactors = thisStoryRegReactions.length
    const guestReactors = thisStoryGuestCounts.reduce((acc: number, g: any) => acc + (g.guest_count || 0), 0)
    const totalReactors = registeredReactors + guestReactors

    // Breakdown by reaction type
    const reactionsByType: Record<string, StoryReactionBreakdown> = {}
    STORY_REACTIONS.forEach((def) => {
      reactionsByType[def.value] = {
        reaction: def.value,
        label: def.label,
        registered: 0,
        guests: 0,
        total: 0,
      }
    })

    thisStoryRegReactions.forEach((r: any) => {
      if (reactionsByType[r.reaction]) {
        reactionsByType[r.reaction].registered += 1
        reactionsByType[r.reaction].total += 1
      }
    })

    thisStoryGuestCounts.forEach((g: any) => {
      if (reactionsByType[g.reaction]) {
        reactionsByType[g.reaction].guests += (g.guest_count || 0)
        reactionsByType[g.reaction].total += (g.guest_count || 0)
      }
    })

    // Find top reaction for this story
    let topReaction: { label: string; count: number; value: string } | undefined
    let maxCount = 0
    Object.values(reactionsByType).forEach((r) => {
      if (r.total > maxCount) {
        maxCount = r.total
        topReaction = { label: r.label, count: r.total, value: r.reaction }
      }
    })

    // Clicks
    const thisStoryClicks = handoffClicks.filter((c: any) => c.story_id === storyId)
    const totalClicks = thisStoryClicks.length
    const registeredClicks = thisStoryClicks.filter((c: any) => !c.is_guest).length
    const guestClicks = thisStoryClicks.filter((c: any) => c.is_guest).length

    // Click Percentage: (totalClicks / totalReactors) * 100
    // Capped at 100% for display unless multiple clicks are intended
    let clickPercentage = 0
    if (hasHandoffLink && totalReactors > 0) {
      clickPercentage = Math.round((totalClicks / totalReactors) * 1000) / 10
    }

    return {
      id: storyId,
      title: story.title,
      category: story.category || 'AI Basics',
      status: story.status || 'Published',
      registeredReactors,
      guestReactors,
      totalReactors,
      reactionsByType,
      topReaction,
      skillsBuildUrl: story.skills_build_url || '',
      skillsBuildButtonText: story.skills_build_button_text || 'Take Course',
      hasHandoffLink,
      totalClicks,
      registeredClicks,
      guestClicks,
      clickPercentage,
    }
  })

  // ── 7. Overall Summary KPIs ─────────────────────────────────────────────────
  const totalStories = storyItems.length
  const storiesWithHandoff = storyItems.filter((s) => s.hasHandoffLink).length

  const totalRegisteredReactions = regReactions.length
  const totalGuestReactions = guestCounts.reduce((acc: number, g: any) => acc + (g.guest_count || 0), 0)
  const totalReactions = totalRegisteredReactions + totalGuestReactions

  const uniqueRegisteredUsers = new Set(regReactions.map((r: any) => r.user_id)).size

  const totalHandoffClicks = handoffClicks.length
  const registeredHandoffClicks = handoffClicks.filter((c: any) => !c.is_guest).length
  const guestHandoffClicks = handoffClicks.filter((c: any) => c.is_guest).length

  // Overall CTR: clicks on stories that have links / total reactors on stories that have links
  const totalReactorsOnStoriesWithLinks = storyItems
    .filter((s) => s.hasHandoffLink)
    .reduce((acc, s) => acc + s.totalReactors, 0)

  const overallHandoffCTR =
    totalReactorsOnStoriesWithLinks > 0
      ? Math.round((totalHandoffClicks / totalReactorsOnStoriesWithLinks) * 1000) / 10
      : 0

  return {
    summary: {
      totalStories,
      storiesWithHandoff,
      totalReactions,
      totalRegisteredReactions,
      totalGuestReactions,
      uniqueRegisteredReactors: uniqueRegisteredUsers,
      totalHandoffClicks,
      registeredHandoffClicks,
      guestHandoffClicks,
      overallHandoffCTR,
      migrationNeeded,
    },
    stories: storyItems,
    registeredLearnerReactions: registeredLearners,
  }
}
