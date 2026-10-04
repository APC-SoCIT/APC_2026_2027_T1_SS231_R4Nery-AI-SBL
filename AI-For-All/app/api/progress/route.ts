/**
 * app/api/progress/route.ts
 *
 * GET  /api/progress  — Fetch the current user's progress (completed stories, points).
 * POST /api/progress  — Mark a story as completed for the current user.
 *
 * Uses the `user_progress` table which has RLS policies ensuring each user
 * can only read and write their own row.
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

// ─── GET /api/progress ────────────────────────────────────────────────────────

export async function GET() {
  const supabase = await buildServerClient()
  const { data: { user }, error: authErr } = await supabase.auth.getUser()

  if (authErr || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { data: progress, error } = await supabase
    .from('user_progress')
    .select('completed_modules, total_points, unlocked_badges')
    .eq('user_id', user.id)
    .maybeSingle()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  // If no row yet (new user), return empty defaults
  return NextResponse.json({
    completedModules: progress?.completed_modules ?? [],
    totalPoints: progress?.total_points ?? 0,
    unlockedBadges: progress?.unlocked_badges ?? [],
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

  // Fetch the existing progress row (if any)
  const { data: existing } = await supabase
    .from('user_progress')
    .select('completed_modules, total_points')
    .eq('user_id', user.id)
    .maybeSingle()

  const currentModules: string[] = existing?.completed_modules ?? []
  const currentPoints: number = existing?.total_points ?? 0

  // Only add the story if not already completed (avoid duplicates)
  const alreadyCompleted = currentModules.includes(storyId)
  const updatedModules = alreadyCompleted
    ? currentModules
    : [...currentModules, storyId]
  const updatedPoints = alreadyCompleted ? currentPoints : currentPoints + 10

  // Upsert the user_progress row
  const { data: updated, error: upsertErr } = await supabase
    .from('user_progress')
    .upsert(
      {
        user_id: user.id,
        completed_modules: updatedModules,
        total_points: updatedPoints,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'user_id' }
    )
    .select('completed_modules, total_points')
    .single()

  if (upsertErr) {
    return NextResponse.json({ error: upsertErr.message }, { status: 500 })
  }

  return NextResponse.json({
    completedModules: updated.completed_modules,
    totalPoints: updated.total_points,
    alreadyCompleted,
  })
}
