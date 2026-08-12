/**
 * lib/supabase/client.ts
 *
 * Browser-side Supabase client.
 * Uses @supabase/ssr's createBrowserClient so that cookies are handled
 * consistently with the server client and middleware.
 *
 * Usage (Client Components / event handlers):
 *   import { createClient } from '@/lib/supabase/client'
 *   const supabase = createClient()
 */
import { createBrowserClient } from '@supabase/ssr'

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}
