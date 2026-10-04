/**
 * app/api/account/deactivate/route.ts
 *
 * POST /api/account/deactivate
 *
 * Deactivates the authenticated user's account by setting their role to
 * 'deactivated' in the users table and banning them from Supabase Auth.
 * Unlike deletion, the user's data and progress are preserved and can be
 * restored by an admin if needed.
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

export async function POST(request: NextRequest) {
  const supabase = await buildServerClient()
  const { data: { user }, error: authErr } = await supabase.auth.getUser()

  if (authErr || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const admin = adminClient()

  // Write a deactivation audit log entry before deactivating.
  try {
    const ip = request.headers.get('x-forwarded-for') ?? request.headers.get('x-real-ip') ?? null
    const ua = request.headers.get('user-agent') ?? null
    await admin.from('account_audit_log').insert({
      user_id: user.id,
      action: 'deactivate',
      ip_address: ip,
      user_agent: ua,
    } as any)
  } catch {
    // Audit log is best-effort; proceed with deactivation.
  }

  // Update the users table to mark the account as deactivated.
  try {
    await admin
      .from('users')
      .update({ role: 'deactivated' } as any)
      .eq('user_id', user.id)
  } catch {
    // Non-fatal if the column doesn't support this value — we still ban via Auth.
  }

  // Ban the user in Supabase Auth (prevents future logins).
  // Using a very long ban duration as a soft-deactivation.
  const { error: banErr } = await admin.auth.admin.updateUserById(user.id, {
    ban_duration: '876000h', // ~100 years
  })

  if (banErr) {
    return NextResponse.json({ error: banErr.message }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
