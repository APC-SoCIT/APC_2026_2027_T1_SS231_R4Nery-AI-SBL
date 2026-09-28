/**
 * app/auth/callback/route.ts  — Google OAuth code exchange + email link verification
 *
 * Handles two kinds of incoming links:
 *   1. OAuth (?code=...)                — exchanged via exchangeCodeForSession
 *   2. Email confirm / magic link       — verified via verifyOtp({ token_hash, type })
 *      (?token_hash=...&type=...)       — requires the Supabase email templates to
 *                                          send token_hash/type instead of the legacy
 *                                          {{ .ConfirmationURL }}. See Auth → Email
 *                                          Templates in the Supabase Dashboard.
 *
 * The redirect URL configured in:
 *   • Google Cloud Console → OAuth Credentials → Authorised redirect URIs
 *   • Supabase Dashboard → Authentication → URL Configuration
 * must include: https://yourdomain.com/auth/callback
 */
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import type { EmailOtpType } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const token_hash = searchParams.get('token_hash')
  const type = searchParams.get('type') as EmailOtpType | null
  // `next` can be set to a deep-link that should be visited after sign-in
  const next = searchParams.get('next') ?? '/home'

  const supabase = await createClient()

  if (code) {
    // Google OAuth (and any other PKCE `code`-based flow)
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (!error) {
      return NextResponse.redirect(`${origin}${next}`)
    }
  } else if (token_hash && type) {
    // Email confirmation / magic link, PKCE `token_hash` flow
    const { error } = await supabase.auth.verifyOtp({ token_hash, type })
    if (!error) {
      return NextResponse.redirect(`${origin}${next}`)
    }
  }

  // Failure — redirect to sign-in with an error indicator
  return NextResponse.redirect(`${origin}/sign-in?error=auth`)
}