/**
 * app/auth/callback/route.ts  — Google OAuth code exchange
 *
 * After Google redirects to Supabase and Supabase redirects back to our app
 * at /auth/callback?code=..., this Route Handler:
 *   1. Exchanges the code for a session (server-side, secure)
 *   2. Redirects the browser to /home on success
 *   3. Redirects to /sign-in?error=auth on failure
 *
 * The redirect URL configured in:
 *   • Google Cloud Console → OAuth Credentials → Authorised redirect URIs
 *   • Supabase Dashboard → Authentication → URL Configuration
 * must include: https://yourdomain.com/auth/callback
 */
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  // `next` can be set to a deep-link that should be visited after sign-in
  const next = searchParams.get('next') ?? '/home'

  if (code) {
    const supabase = await createClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (!error) {
      // Successful OAuth — send the user to the intended destination
      return NextResponse.redirect(`${origin}${next}`)
    }
  }

  // Failure — redirect to sign-in with an error indicator
  return NextResponse.redirect(`${origin}/sign-in?error=auth`)
}
