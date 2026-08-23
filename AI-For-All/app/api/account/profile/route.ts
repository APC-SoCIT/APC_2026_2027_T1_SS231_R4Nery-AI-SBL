/**
 * app/api/account/profile/route.ts
 *
 * GET  /api/account/profile  — Fetch the current user's profile row.
 * PATCH /api/account/profile — Update the current user's profile name.
 *
 * Both endpoints are protected by proxy.ts which redirects unauthenticated
 * requests to /sign-in before they reach this route.
 */
import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { adminClient } from '@/lib/supabase/admin'
import { cookies } from 'next/headers'

/** Build an SSR Supabase client that honours the current session cookies. */
async function buildServerClient() {
  const cookieStore = await cookies()
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return cookieStore.getAll() },
        setAll(toSet) {
          try { toSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options)) }
          catch { /* read-only in Route Handlers — safe to ignore */ }
        },
      },
    }
  )
}

// ─── GET /api/account/profile ─────────────────────────────────────────────────

export async function GET() {
  const supabase = await buildServerClient()
  const { data: { user }, error: authErr } = await supabase.auth.getUser()

  if (authErr || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { data: profile, error } = await supabase
    .from('profiles')
    .select('id, name, role, created_at, updated_at')
    .eq('id', user.id)
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({
    id: profile.id,
    name: profile.name,
    email: user.email,
    role: profile.role,
    authMethod: user.app_metadata?.provider ?? 'email',
    createdAt: profile.created_at,
    updatedAt: profile.updated_at,
  })
}

// ─── PATCH /api/account/profile ───────────────────────────────────────────────

export async function PATCH(request: NextRequest) {
  const supabase = await buildServerClient()
  const { data: { user }, error: authErr } = await supabase.auth.getUser()

  if (authErr || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await request.json().catch(() => ({}))
  const name: string = typeof body.name === 'string' ? body.name.trim() : ''

  if (!name) {
    return NextResponse.json({ error: 'Name is required.' }, { status: 400 })
  }
  if (name.length > 255) {
    return NextResponse.json({ error: 'Name must be 255 characters or fewer.' }, { status: 400 })
  }

  // Update the profiles row (RLS allows only the owner to update their own row).
  const { data: updated, error: updateErr } = await supabase
    .from('profiles')
    .update({ name, updated_at: new Date().toISOString() })
    .eq('id', user.id)
    .select('id, name, role, updated_at')
    .single()

  if (updateErr) {
    return NextResponse.json({ error: updateErr.message }, { status: 500 })
  }

  // Write audit log entry using the service-role admin client.
  try {
    const admin = adminClient()
    const ip = request.headers.get('x-forwarded-for') ?? request.headers.get('x-real-ip') ?? null
    const ua = request.headers.get('user-agent') ?? null
    await admin.from('account_audit_log').insert({
      user_id: user.id,
      action: 'profile_update',
      ip_address: ip,
      user_agent: ua,
    } as any)
  } catch {
    // Audit log failures are non-fatal — don't block the update response.
  }

  return NextResponse.json({
    id: updated.id,
    name: updated.name,
    email: user.email,
    role: updated.role,
    updatedAt: updated.updated_at,
  })
}
