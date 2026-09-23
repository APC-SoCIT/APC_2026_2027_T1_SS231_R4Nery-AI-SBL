import { createClient } from './client'
import { defaultStories, StoryModule } from '../story-data'

export type StoryBreakdown = {
  draft: number
  published: number
  archived: number
  byLevel: Record<string, number>
  byType: Record<string, number>
  byCategory: { name: string; count: number }[]
}

export type ContentHealthItem = {
  id: string
  title: string
  issue: string
  severity: 'warn' | 'error'
}

export type DashboardStats = {
  totalStories: number
  publishedStories: number
  draftStories: number
  archivedStories: number
  totalUsers: number
  registeredUsers: number
  breakdown: StoryBreakdown
  contentHealth: ContentHealthItem[]
  publishedStoryIds: string[] // for presence subscription
  recentStories: { id: string; title: string; status: string; updatedAt: string }[]
}

/**
 * Aggregate content health issues for a list of stories.
 */
function buildContentHealth(stories: StoryModule[]): ContentHealthItem[] {
  const items: ContentHealthItem[] = []

  for (const s of stories) {
    if (s.status === 'Archived') continue

    if (!s.scenes || s.scenes.length === 0) {
      items.push({ id: s.id, title: s.title, issue: 'No scenes', severity: 'error' })
    }

    if (!s.description || s.description.trim() === '') {
      items.push({ id: s.id, title: s.title, issue: 'Missing description', severity: 'warn' })
    }

    if (!s.skillsBuildUrl || s.skillsBuildUrl.trim() === '') {
      items.push({ id: s.id, title: s.title, issue: 'No SkillsBuild URL', severity: 'warn' })
    }

    if (s.type === 'with_activity' && (!s.activity?.intellectPrompt || !s.activity?.otherRoutePrompt)) {
      items.push({ id: s.id, title: s.title, issue: 'Incomplete activity prompts', severity: 'error' })
    }
  }

  // Sort: errors first, then warnings
  return items.sort((a, b) => (a.severity === 'error' && b.severity !== 'error' ? -1 : 1))
}

/**
 * Fetch all dashboard analytics stats.
 * Queries the stories and users tables in Supabase, falls back to defaults gracefully.
 */
export async function fetchDashboardStats(): Promise<DashboardStats> {
  const supabase = createClient()

  // ── 1. Fetch all stories ──────────────────────────────────────────────────
  let stories: StoryModule[] = []
  try {
    const { data, error } = await supabase
      .from('stories')
      .select('id,title,category,level,type,status,description,skills_build_url,scenes,activity,updated_at')
      .order('created_at', { ascending: false })

    if (!error && data && data.length > 0) {
      stories = data.map((row: any) => ({
        id: row.id,
        title: row.title,
        category: row.category || 'Uncategorized',
        level: row.level || 'Starter',
        type: row.type === 'with_activity' ? 'with_activity' : 'choices_only',
        status: row.status || 'Draft',
        description: row.description || '',
        skillsBuildUrl: row.skills_build_url || '',
        scenes: row.scenes || [],
        activity: row.activity || undefined,
        updatedAt: row.updated_at ? new Date(row.updated_at).toLocaleDateString() : 'Recently',
        color: '',
        image: '',
      }))
    } else if (!data || data.length === 0) {
      stories = defaultStories
    }
  } catch {
    stories = defaultStories
  }

  // ── 2. Fetch user counts ───────────────────────────────────────────────────
  let totalUsers = 0
  let registeredUsers = 0
  try {
    const { count: allCount } = await supabase
      .from('users')
      .select('user_id', { count: 'exact', head: true })

    const { count: regCount } = await supabase
      .from('users')
      .select('user_id', { count: 'exact', head: true })
      .neq('role', 'guest')

    totalUsers = allCount ?? 0
    registeredUsers = regCount ?? 0
  } catch {
    // leave at 0 — no fabricated data
  }

  // ── 3. Compute story breakdown ─────────────────────────────────────────────
  const published = stories.filter(s => s.status === 'Published')
  const draft = stories.filter(s => s.status === 'Draft')
  const archived = stories.filter(s => s.status === 'Archived')

  const byLevel: Record<string, number> = {}
  const byType: Record<string, number> = {}
  const categoryMap: Record<string, number> = {}

  for (const s of stories) {
    byLevel[s.level] = (byLevel[s.level] || 0) + 1
    const typeLabel = s.type === 'with_activity' ? 'With Activity' : 'Choices Only'
    byType[typeLabel] = (byType[typeLabel] || 0) + 1
    categoryMap[s.category] = (categoryMap[s.category] || 0) + 1
  }

  const byCategory = Object.entries(categoryMap)
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5)

  const breakdown: StoryBreakdown = {
    draft: draft.length,
    published: published.length,
    archived: archived.length,
    byLevel,
    byType,
    byCategory,
  }

  // ── 4. Content health ──────────────────────────────────────────────────────
  const contentHealth = buildContentHealth(stories)

  // ── 5. Recent stories (top 5) ─────────────────────────────────────────────
  const recentStories = stories.slice(0, 5).map(s => ({
    id: s.id,
    title: s.title,
    status: s.status,
    updatedAt: s.updatedAt || 'Recently',
  }))

  return {
    totalStories: stories.length,
    publishedStories: published.length,
    draftStories: draft.length,
    archivedStories: archived.length,
    totalUsers,
    registeredUsers,
    breakdown,
    contentHealth,
    publishedStoryIds: published.map(s => s.id),
    recentStories,
  }
}
