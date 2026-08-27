/**
 * lib/supabase/admin.ts
 *
 * Service-role Supabase client.
 * ⚠️  SERVER-ONLY — this file must NEVER be imported in Client Components or
 *     bundled to the browser. It uses SUPABASE_SERVICE_ROLE_KEY which bypasses
 *     Row Level Security entirely.
 *
 * Used by:
 *   - DELETE /api/account  (Phase 4 — hard-delete a user via admin.deleteUser)
 *
 * Usage:
 *   import { adminClient } from '@/lib/supabase/admin'
 *   await adminClient.auth.admin.deleteUser(userId)
 */
import { createClient } from '@supabase/supabase-js'

// Singleton — avoid creating a new client on every Route Handler invocation
let _adminClient: ReturnType<typeof createClient> | null = null

export function adminClient() {
  if (!_adminClient) {
    _adminClient = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      {
        auth: {
          // Service-role clients must NOT persist sessions — they act as the
          // service itself, not as any individual user.
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    )
  }
  return _adminClient
}
