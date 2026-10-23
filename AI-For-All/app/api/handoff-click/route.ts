/**
 * app/api/handoff-click/route.ts
 *
 * POST /api/handoff-click — Records a click on the IBM SkillsBuild handoff link.
 * Supports both registered users (authenticated) and guests (anonymous).
 *
 * Requires the public.story_handoff_clicks table — run supabase-handoff-clicks.sql
 * once in the Supabase SQL editor.
 */
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { adminClient } from '@/lib/supabase/admin'

export const dynamic = 'force-dynamic'

async function readStoryId(request: NextRequest): Promise<string> {
  // navigator.sendBeacon may deliver the body with a non-JSON content type
  // depending on the browser, so parse the raw text instead of request.json().
  try {
    const raw = await request.text()
    const body = raw ? JSON.parse(raw) : {}
    return typeof body.storyId === 'string' ? body.storyId.trim() : ''
  } catch {
    return ''
  }
}

export async function POST(request: NextRequest) {
  try {
    const storyId = await readStoryId(request)

    if (!storyId || storyId.length > 200) {
      return NextResponse.json({ ok: false, error: 'storyId is required.' }, { status: 400 })
    }

    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
      console.error('[Handoff Click] SUPABASE_SERVICE_ROLE_KEY / NEXT_PUBLIC_SUPABASE_URL is not set — click NOT recorded.')
      return NextResponse.json(
        { ok: false, stored: false, error: 'Server is missing Supabase service-role configuration.' },
        { status: 500 }
      )
    }

    // Identify the user (null => guest). Never let an auth hiccup lose the click.
    let userId: string | null = null
    try {
      const supabase = await createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (user && !user.is_anonymous) userId = user.id
    } catch {
      userId = null
    }

    const { error } = await adminClient()
      .from('story_handoff_clicks')
      .insert({
        story_id: storyId,
        user_id: userId,
        is_guest: userId === null,
      })

    if (error) {
      const tableMissing =
        error.code === 'PGRST205' ||
        error.code === '42P01' ||
        error.message?.includes('does not exist') ||
        error.message?.includes('schema cache')

      if (tableMissing) {
        console.error(
          '[Handoff Click] public.story_handoff_clicks does not exist — click NOT recorded. ' +
            'Run supabase-handoff-clicks.sql in the Supabase SQL editor.'
        )
        return NextResponse.json(
          { ok: false, stored: false, error: 'story_handoff_clicks table missing. Run supabase-handoff-clicks.sql.' },
          { status: 503 }
        )
      }

      console.error('[Handoff Click] Insert error:', error)
      return NextResponse.json({ ok: false, stored: false, error: error.message }, { status: 500 })
    }

    return NextResponse.json({ ok: true, stored: true })
  } catch (err: any) {
    console.error('[Handoff Click] Fatal error:', err)
    return NextResponse.json({ ok: false, error: err?.message || 'Internal error' }, { status: 500 })
  }
}
