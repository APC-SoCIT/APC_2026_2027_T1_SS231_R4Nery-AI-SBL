/**
 * app/api/reactions/route.ts
 *
 * GET  /api/reactions?storyId=...  Fetch the current user's reaction to a story.
 * POST /api/reactions              Record (or update) the current user's reaction to a story.
 *
 * Uses the `story_reactions` table (see supabase-story-reactions.sql). RLS
 * policies ensure each user can only read, insert and update their own rows,
 * and a UNIQUE (user_id, story_id) constraint keeps one reaction per story.
 * The user id always comes from the server-side session, never the request body.
 */
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { isStoryReactionValue } from '@/lib/reactions'

// ─── GET /api/reactions ───────────────────────────────────────────────────────

export async function GET(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user }, error: authErr } = await supabase.auth.getUser()

  if (authErr || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const storyId = request.nextUrl.searchParams.get('storyId')?.trim() ?? ''
  if (!storyId) {
    return NextResponse.json({ error: 'storyId is required.' }, { status: 400 })
  }

  const { data, error } = await supabase
    .from('story_reactions')
    .select('reaction, updated_at')
    .eq('user_id', user.id)
    .eq('story_id', storyId)
    .maybeSingle()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({
    reaction: data?.reaction ?? null,
    updatedAt: data?.updated_at ?? null,
  })
}

// ─── POST /api/reactions ──────────────────────────────────────────────────────

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user }, error: authErr } = await supabase.auth.getUser()

  if (authErr || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await request.json().catch(() => ({}))
  const storyId: string = typeof body.storyId === 'string' ? body.storyId.trim() : ''
  const reaction: unknown = typeof body.reaction === 'string' ? body.reaction.trim() : body.reaction

  if (!storyId) {
    return NextResponse.json({ error: 'storyId is required.' }, { status: 400 })
  }
  if (!isStoryReactionValue(reaction)) {
    return NextResponse.json({ error: 'Please pick a valid reaction.' }, { status: 400 })
  }

  // One row per (user_id, story_id): insert the first time, update afterwards.
  // created_at keeps its original value on update; updated_at is refreshed.
  const { data: saved, error: upsertErr } = await supabase
    .from('story_reactions')
    .upsert(
      {
        user_id: user.id,
        story_id: storyId,
        reaction,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'user_id,story_id' }
    )
    .select('reaction, created_at, updated_at')
    .single()

  if (upsertErr) {
    return NextResponse.json({ error: upsertErr.message }, { status: 500 })
  }

  return NextResponse.json({
    reaction: saved.reaction,
    createdAt: saved.created_at,
    updatedAt: saved.updated_at,
  })
}