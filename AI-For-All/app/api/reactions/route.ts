/**
 * app/api/reactions/route.ts
 *
 * GET  /api/reactions?storyId=...  Fetch the signed-in learner's reaction to a story.
 * POST /api/reactions              Record (or update) a reaction to a story.
 *
 * Registered (logged-in) learners: one row per user + story in `story_reactions`,
 * identified by the server-side session, never the request body. RLS policies
 * ensure each user can only read, insert and update their own row, and a
 * UNIQUE (user_id, story_id) constraint keeps one reaction per story. Their name
 * is shown through the `story_reactions_registered` view (joined from public.users).
 *
 * Guests (Supabase anonymous users, or no session at all): nothing identifying is
 * stored. Their reaction only adds 1 to a per-story, per-reaction tally in
 * `story_reaction_guest_counts`, through the record_guest_reaction() database
 * function (service role only). If the guest changes their reaction, the browser
 * sends the previous one so it is moved instead of counted twice.
 * Guest writes are rate limited per network (salted hash of the IP, kept only in a
 * short-lived throttle table that is not linked to any reaction).
 *
 * Totals per story/reaction live in the `story_reaction_counts` view.
 */
import { createHash } from 'crypto'
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { adminClient } from '@/lib/supabase/admin'
import { isStoryReactionValue } from '@/lib/reactions'

// Rate limit for guest reactions. Caravan tablets usually share one mall
// Wi-Fi IP, so keep this generous enough for a busy session.
const GUEST_LIMIT_MAX = 30
const GUEST_LIMIT_WINDOW_MINUTES = 10

/**
 * One-way hash of the caller's IP so raw IP addresses are never stored.
 * Salted with REACTION_IP_SALT (falls back to the service-role key, which is
 * already a server-only secret) so the hash can't be reversed by brute force.
 */
function hashRequestIp(request: NextRequest): string {
  const ip =
    request.headers.get('x-real-ip')?.trim() ||
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    'unknown'
  const salt = process.env.REACTION_IP_SALT || process.env.SUPABASE_SERVICE_ROLE_KEY || ''
  return createHash('sha256').update(`${salt}:${ip}`).digest('hex')
}

// ─── GET /api/reactions ───────────────────────────────────────────────────────

export async function GET(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  // Guests have no stored row; their last pick is remembered in the browser instead
  if (!user || user.is_anonymous) {
    return NextResponse.json({ reaction: null, updatedAt: null })
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
  const { data: { user } } = await supabase.auth.getUser()

  const body = await request.json().catch(() => ({}))
  const storyId: string = typeof body.storyId === 'string' ? body.storyId.trim() : ''
  const reaction: unknown = typeof body.reaction === 'string' ? body.reaction.trim() : body.reaction

  if (!storyId) {
    return NextResponse.json({ error: 'storyId is required.' }, { status: 400 })
  }
  if (!isStoryReactionValue(reaction)) {
    return NextResponse.json({ error: 'Please pick a valid reaction.' }, { status: 400 })
  }

  // ── Guest: add to the anonymous tally only ──
  if (!user || user.is_anonymous) {
    const previous = isStoryReactionValue(body.previousReaction) ? body.previousReaction : null
    const { data: result, error: rpcErr } = await adminClient().rpc('record_guest_reaction', {
      p_story_id: storyId,
      p_reaction: reaction,
      p_previous: previous,
      p_ip_hash: hashRequestIp(request),
      p_max: GUEST_LIMIT_MAX,
      p_window_minutes: GUEST_LIMIT_WINDOW_MINUTES,
    } as any) // adminClient is untyped; same pattern as app/api/account

    if (rpcErr) {
      return NextResponse.json({ error: rpcErr.message }, { status: 500 })
    }
    if (result === 'limited') {
      return NextResponse.json(
        { error: 'Lots of reactions are coming from this network right now. Yours wasn’t saved, but you can keep going.' },
        { status: 429 }
      )
    }
    return NextResponse.json({ reaction, createdAt: null, updatedAt: null })
  }

  // ── Registered: one row per (user_id, story_id), insert first time, update afterwards ──
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