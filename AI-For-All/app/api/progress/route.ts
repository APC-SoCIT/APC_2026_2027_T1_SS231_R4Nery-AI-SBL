/**
 * app/api/progress/route.ts
 *
 * GET  /api/progress  — Fetch the current user's progress (completed stories, points).
 * POST /api/progress  — Mark a story as completed for the current user.
 *
 * Uses the project's existing `mall_goers` + `progress` tables (there is no
 * `user_progress` table in the live database). Mapping:
 *   auth.users.id -> users.auth_user_id -> users.user_id
 *   -> mall_goers.users_user_id -> mall_goers.mall_goer_id
 *   -> progress.participant_id   (one row per story, status = 'completed')
 *   stories.id -> progress.story_id
 * RLS policies restrict every row to the signed-in user (see Supabase SQL fix).
 */
import { NextRequest, NextResponse } from 'next/server'
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

// Resolve the signed-in auth user to their mall_goers row (optionally creating it).
// users.user_id is NOT always equal to auth.users.id in this database, so the
// lookup goes through users.auth_user_id.
async function getMallGoer(
  supabase: Awaited<ReturnType<typeof buildServerClient>>,
  authUserId: string,
  createIfMissing: boolean,
): Promise<{ mallGoer: { mall_goer_id: string; points: number | null } | null; error?: string }> {
  const { data: userRow, error: userErr } = await supabase
    .from('users')
    .select('user_id')
    .eq('auth_user_id', authUserId)
    .maybeSingle()
  if (userErr) return { mallGoer: null, error: userErr.message }
  if (!userRow) return { mallGoer: null, error: createIfMissing ? 'No users row found for this account.' : undefined }

  const { data: mallGoer, error: mgErr } = await supabase
    .from('mall_goers')
    .select('mall_goer_id, points')
    .eq('users_user_id', userRow.user_id)
    .maybeSingle()
  if (mgErr) return { mallGoer: null, error: mgErr.message }
  if (mallGoer || !createIfMissing) return { mallGoer }

  const { data: created, error: insErr } = await supabase
    .from('mall_goers')
    .insert({ users_user_id: userRow.user_id, is_guest: false })
    .select('mall_goer_id, points')
    .single()
  if (insErr) return { mallGoer: null, error: insErr.message }
  return { mallGoer: created }
}

// Completed story ids (and when each was completed) for a mall goer.
async function getCompleted(
  supabase: Awaited<ReturnType<typeof buildServerClient>>,
  mallGoerId: string,
): Promise<{ ids: string[]; dates: Record<string, string>; error?: string }> {
  const { data, error } = await supabase
    .from('progress')
    .select('story_id, date_updated')
    .eq('participant_id', mallGoerId)
    .eq('status', 'completed')
    .order('date_updated', { ascending: true })
  if (error) return { ids: [], dates: {}, error: error.message }
  const ids: string[] = []
  const dates: Record<string, string> = {}
  for (const row of data ?? []) {
    if (!row.story_id) continue
    ids.push(row.story_id)
    dates[row.story_id] = row.date_updated
  }
  return { ids, dates }
}

// ─── GET /api/progress ────────────────────────────────────────────────────────

export async function GET() {
  const supabase = await buildServerClient()
  const { data: { user }, error: authErr } = await supabase.auth.getUser()

  if (authErr || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { mallGoer, error: mgError } = await getMallGoer(supabase, user.id, false)
  if (mgError) {
    return NextResponse.json({ error: mgError }, { status: 500 })
  }

  // If no mall_goers row yet (new user), return empty defaults
  if (!mallGoer) {
    return NextResponse.json({ completedModules: [], completedDates: {}, unlockedBadges: [] })
  }

  const completed = await getCompleted(supabase, mallGoer.mall_goer_id)
  if (completed.error) {
    return NextResponse.json({ error: completed.error }, { status: 500 })
  }

  return NextResponse.json({
    completedModules: completed.ids,
    completedDates: completed.dates,
    unlockedBadges: [],
  })
}

// ─── POST /api/progress ───────────────────────────────────────────────────────

export async function POST(request: NextRequest) {
  const supabase = await buildServerClient()
  const { data: { user }, error: authErr } = await supabase.auth.getUser()

  if (authErr || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await request.json().catch(() => ({}))
  const storyId: string = typeof body.storyId === 'string' ? body.storyId.trim() : ''

  if (!storyId) {
    return NextResponse.json({ error: 'storyId is required.' }, { status: 400 })
  }

  const { mallGoer, error: mgError } = await getMallGoer(supabase, user.id, true)
  if (mgError || !mallGoer) {
    return NextResponse.json({ error: mgError ?? 'Could not resolve mall goer.' }, { status: 500 })
  }

  // Fetch the existing progress row for this story (if any)
  const { data: existing, error: existingErr } = await supabase
    .from('progress')
    .select('status')
    .eq('participant_id', mallGoer.mall_goer_id)
    .eq('story_id', storyId)
    .maybeSingle()
  if (existingErr) {
    return NextResponse.json({ error: existingErr.message }, { status: 500 })
  }

  // Only allow one progress row per (story_id, participant_id).
  const alreadyCompleted = existing?.status === 'completed'

  // One row per (story_id, participant_id), matching the table's unique constraint
  const { error: upsertErr } = await supabase
    .from('progress')
    .upsert(
      {
        story_id: storyId,
        participant_id: mallGoer.mall_goer_id,
        status: 'completed',
        date_updated: new Date().toISOString(),
      },
      { onConflict: 'story_id,participant_id' }
    )

  if (upsertErr) {
    return NextResponse.json({ error: upsertErr.message }, { status: 500 })
  }

  const completed = await getCompleted(supabase, mallGoer.mall_goer_id)

  return NextResponse.json({
    completedModules: completed.ids,
    alreadyCompleted,
  })
}