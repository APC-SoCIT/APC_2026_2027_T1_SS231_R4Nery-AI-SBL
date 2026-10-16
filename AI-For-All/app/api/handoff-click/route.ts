/**
 * app/api/handoff-click/route.ts
 *
 * POST /api/handoff-click — Records a click on the IBM SkillsBuild handoff link.
 * Supports both registered users (authenticated) and guests (anonymous).
 */
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { adminClient } from '@/lib/supabase/admin'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}))
    const storyId: string = typeof body.storyId === 'string' ? body.storyId.trim() : ''

    if (!storyId) {
      return NextResponse.json({ error: 'storyId is required.' }, { status: 400 })
    }

    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    const isGuest = !user || user.is_anonymous
    const userId = !isGuest ? user.id : null

    // Record the click in public.story_handoff_clicks using service role client
    const { data, error } = await adminClient()
      .from('story_handoff_clicks')
      .insert({
        story_id: storyId,
        user_id: userId,
        is_guest: isGuest,
      })
      .select('click_id, clicked_at')
      .single()

    if (error) {
      // If table doesn't exist yet (before running migration in Supabase SQL Editor),
      // log warning and return friendly response so learner UX is never interrupted.
      if (error.code === 'PGRST205' || error.message?.includes('does not exist') || error.message?.includes('schema cache')) {
        console.warn('[Handoff Click] story_handoff_clicks table not found. Please run supabase-metrics.sql in Supabase SQL editor.')
        return NextResponse.json({ ok: true, stored: false, warning: 'Migration pending' })
      }
      console.error('[Handoff Click] Insert error:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({
      ok: true,
      stored: true,
      clickId: data?.click_id,
      clickedAt: data?.clicked_at,
    })
  } catch (err: any) {
    console.error('[Handoff Click] Fatal error:', err)
    return NextResponse.json({ ok: false, error: err?.message || 'Internal error' }, { status: 500 })
  }
}
