/**
 * app/api/account/route.ts
 *
 * DELETE /api/account — Hard-delete the authenticated user from Supabase Auth.
 *
 * Uses the service-role adminClient to call auth.admin.deleteUser().
 * Cascades to profiles, user_progress, and account_audit_log via FK ON DELETE CASCADE.
 *
 * Protected by proxy.ts — unauthenticated requests are redirected to /sign-in.
 */
import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { adminClient } from '@/lib/supabase/admin'
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
          try { toSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options)) }
          catch { /* ignore in Route Handler context */ }
        },
      },
    }
  )
}

export async function DELETE(request: NextRequest) {
  const supabase = await buildServerClient()
  const { data: { user }, error: authErr } = await supabase.auth.getUser()

  if (authErr || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Write a deletion audit log entry BEFORE deleting (the row will cascade-delete with the user).
  try {
    const admin = adminClient()
    const ip = request.headers.get('x-forwarded-for') ?? request.headers.get('x-real-ip') ?? null
    const ua = request.headers.get('user-agent') ?? null
    await admin.from('account_audit_log').insert({
      user_id: user.id,
      action: 'delete',
      ip_address: ip,
      user_agent: ua,
    } as any)
  } catch {
    // Audit log is best-effort; proceed with deletion.
  }

  // Hard-delete the user — requires the service-role key.
  const admin = adminClient()
  const { error: deleteErr } = await admin.auth.admin.deleteUser(user.id)

  if (deleteErr) {
    return NextResponse.json({ error: deleteErr.message }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
