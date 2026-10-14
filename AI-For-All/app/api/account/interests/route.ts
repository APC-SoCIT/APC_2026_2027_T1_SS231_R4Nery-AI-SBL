/**
 * app/api/account/interests/route.ts
 *
 * PATCH /api/account/interests
 * Body: { interests: string[] }  (1–3 topic strings)
 *
 * Saves the user's chosen interests to users.interests (TEXT[]).
 * Requires the user to be signed in.
 *
 * NOTE: Run this SQL once in Supabase to add the column:
 *   ALTER TABLE public.users ADD COLUMN IF NOT EXISTS interests TEXT[] DEFAULT '{}';
 */
import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { MAX_INTERESTS, PRESET_TOPICS } from '@/lib/topics'

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
          } catch { /* read-only in Route Handlers */ }
        },
      },
    }
  )
}

export async function PATCH(request: NextRequest) {
  const supabase = await buildServerClient()
  const { data: { user }, error: authErr } = await supabase.auth.getUser()

  if (authErr || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await request.json().catch(() => ({}))
  const interests: unknown = body.interests

  if (!Array.isArray(interests)) {
    return NextResponse.json({ error: 'interests must be an array.' }, { status: 400 })
  }
  if (interests.length < 1 || interests.length > MAX_INTERESTS) {
    return NextResponse.json(
      { error: `Pick between 1 and ${MAX_INTERESTS} interests.` },
      { status: 400 }
    )
  }

  // Validate each entry is a known topic (or reasonably short custom string)
  const cleaned = (interests as unknown[])
    .map((t) => (typeof t === 'string' ? t.trim() : ''))
    .filter(Boolean)
    .slice(0, MAX_INTERESTS)

  for (const t of cleaned) {
    if (t.length > 80) {
      return NextResponse.json({ error: 'Topic name too long.' }, { status: 400 })
    }
  }

  const { error: updateErr } = await supabase
    .from('users')
    .update({ interests: cleaned })
    .eq('user_id', user.id)

  if (updateErr) {
    // If the column doesn't exist yet, return a helpful error
    return NextResponse.json(
      { error: updateErr.message },
      { status: 500 }
    )
  }

  return NextResponse.json({ ok: true, interests: cleaned })
}

export async function GET() {
  const supabase = await buildServerClient()
  const { data: { user }, error: authErr } = await supabase.auth.getUser()

  if (authErr || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { data, error } = await supabase
    .from('users')
    .select('interests')
    .eq('user_id', user.id)
    .maybeSingle()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ interests: data?.interests ?? [] })
}
