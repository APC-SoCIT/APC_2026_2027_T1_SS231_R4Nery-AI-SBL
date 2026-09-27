/**
 * app/api/account/avatar/route.ts
 *
 * GET  /api/account/avatar  — Return the current user's avatar URL.
 * POST /api/account/avatar  — Upload a new avatar image to Supabase Storage.
 *
 * Storage bucket: "avatars"  (public bucket, file path: {userId}.{ext})
 * After upload, updates users.avatar_url with the public URL.
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
          catch { /* read-only in Route Handlers */ }
        },
      },
    }
  )
}

// ─── GET /api/account/avatar ──────────────────────────────────────────────────

export async function GET() {
  const supabase = await buildServerClient()
  const { data: { user }, error: authErr } = await supabase.auth.getUser()

  if (authErr || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { data: row } = await supabase
    .from('users')
    .select('avatar_url')
    .eq('user_id', user.id)
    .single()

  return NextResponse.json({ avatarUrl: row?.avatar_url ?? null })
}

// ─── POST /api/account/avatar ─────────────────────────────────────────────────

export async function POST(request: NextRequest) {
  const supabase = await buildServerClient()
  const { data: { user }, error: authErr } = await supabase.auth.getUser()

  if (authErr || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let formData: FormData
  try {
    formData = await request.formData()
  } catch {
    return NextResponse.json({ error: 'Invalid form data.' }, { status: 400 })
  }

  const file = formData.get('file') as File | null
  if (!file || file.size === 0) {
    return NextResponse.json({ error: 'No file provided.' }, { status: 400 })
  }

  // Validate mime type
  const allowed = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']
  if (!allowed.includes(file.type)) {
    return NextResponse.json({ error: 'Only JPEG, PNG, WebP or GIF images are allowed.' }, { status: 400 })
  }

  // Max 5 MB
  if (file.size > 5 * 1024 * 1024) {
    return NextResponse.json({ error: 'Image must be smaller than 5 MB.' }, { status: 400 })
  }

  const ext = file.type.split('/')[1].replace('jpeg', 'jpg')
  const filePath = `${user.id}.${ext}`

  // Use admin client so we bypass storage RLS during upload
  const admin = adminClient()
  const buffer = Buffer.from(await file.arrayBuffer())

  const { error: uploadErr } = await admin.storage
    .from('avatars')
    .upload(filePath, buffer, {
      contentType: file.type,
      upsert: true,
    })

  if (uploadErr) {
    return NextResponse.json({ error: uploadErr.message }, { status: 500 })
  }

  // Get public URL
  const { data: urlData } = admin.storage.from('avatars').getPublicUrl(filePath)
  const avatarUrl = urlData.publicUrl

  // Persist to users table (using user-scoped client respects RLS)
  const { error: updateErr } = await supabase
    .from('users')
    .update({ avatar_url: avatarUrl } as any)
    .eq('user_id', user.id)

  if (updateErr) {
    // Non-fatal — the upload succeeded even if DB update fails
    console.error('Failed to update avatar_url in users table:', updateErr.message)
  }

  return NextResponse.json({ avatarUrl })
}
