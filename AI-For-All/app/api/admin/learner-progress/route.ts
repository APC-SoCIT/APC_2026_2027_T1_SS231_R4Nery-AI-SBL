/**
 * app/api/admin/learner-progress/route.ts
 *
 * GET /api/admin/learner-progress
 *
 * Returns:
 *   {
 *     totalPublished: number,           // total published stories
 *     progress: Record<string, number>, // user_id -> completed story count
 *     interests: Record<string, string[]> // user_id -> chosen topics
 *   }
 *
 * Chain: users.user_id -> mall_goers.users_user_id -> mall_goers.mall_goer_id
 *        -> progress.participant_id (status = 'completed')
 *
 * Only accessible by admins (role check on the users table).
 */
import { NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

async function buildServerClient() {
  const cookieStore = await cookies()
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return cookieStore.getAll() },
        setAll(toSet) {
          try {
            toSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options))
          } catch {
            // read-only in Route Handlers — safe to ignore
          }
        },
      },
    }
  )
}

export async function GET() {
  const supabase = await buildServerClient()

  // Auth check
  const { data: { user }, error: authErr } = await supabase.auth.getUser()
  if (authErr || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Verify the caller is an admin
  const { data: callerRow } = await supabase
    .from('users')
    .select('role')
    .eq('auth_user_id', user.id)
    .maybeSingle()

  if (!callerRow || callerRow.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  // 1. Count total published stories
  const { count: totalPublished, error: storiesErr } = await supabase
    .from('stories')
    .select('id', { count: 'exact', head: true })
    .eq('status', 'Published')

  if (storiesErr) {
    return NextResponse.json({ error: storiesErr.message }, { status: 500 })
  }

  // 2. Fetch all mall_goers with their user_id
  const { data: mallGoers, error: mgErr } = await supabase
    .from('mall_goers')
    .select('mall_goer_id, users_user_id')

  if (mgErr) {
    return NextResponse.json({ error: mgErr.message }, { status: 500 })
  }

  if (!mallGoers || mallGoers.length === 0) {
    return NextResponse.json({ totalPublished: totalPublished ?? 0, progress: {} })
  }

  // 3. Fetch all completed progress rows
  const mallGoerIds = mallGoers.map((mg) => mg.mall_goer_id)

  const { data: progressRows, error: progErr } = await supabase
    .from('progress')
    .select('participant_id, story_id')
    .in('participant_id', mallGoerIds)
    .eq('status', 'completed')

  if (progErr) {
    return NextResponse.json({ error: progErr.message }, { status: 500 })
  }

  // 4. Build a map: mall_goer_id -> count of unique completed stories
  const completedByMallGoer: Record<string, Set<string>> = {}
  for (const row of progressRows ?? []) {
    if (!row.participant_id || !row.story_id) continue
    if (!completedByMallGoer[row.participant_id]) {
      completedByMallGoer[row.participant_id] = new Set()
    }
    completedByMallGoer[row.participant_id].add(row.story_id)
  }

  // 5. Map user_id -> completed count
  const progress: Record<string, number> = {}
  for (const mg of mallGoers) {
    const userId = mg.users_user_id
    const count = completedByMallGoer[mg.mall_goer_id]?.size ?? 0
    // A user could have multiple mall_goer rows; sum them up
    progress[userId] = (progress[userId] ?? 0) + count
  }

  // 6. Fetch interests for all non-admin users
  const userIds = [...new Set(mallGoers.map(mg => mg.users_user_id))]
  const { data: usersRows } = await supabase
    .from('users')
    .select('user_id, interests')
    .in('user_id', userIds)

  const interests: Record<string, string[]> = {}
  for (const row of usersRows ?? []) {
    interests[row.user_id] = Array.isArray(row.interests) ? row.interests : []
  }

  return NextResponse.json({
    totalPublished: totalPublished ?? 0,
    progress,
    interests,
  })
}
