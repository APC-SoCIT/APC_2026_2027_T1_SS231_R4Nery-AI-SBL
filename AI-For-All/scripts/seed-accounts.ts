/**
 * scripts/seed-accounts.ts
 *
 * Creates two test accounts in Supabase Auth + corresponding `users` table rows:
 *   - user@aiforall.test  / password: user   (role: 'user')
 *   - admin@aiforall.test / password: admin  (role: 'admin')
 *
 * Usage:
 *   npx tsx scripts/seed-accounts.ts
 *
 * Requires .env.local with NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.
 */

import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
import * as path from 'path'

// Load .env.local from project root
dotenv.config({ path: path.resolve(__dirname, '..', '.env.local') })

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error('❌ Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
})

interface AccountSeed {
  email: string
  password: string
  name: string
  role: string
}

const ACCOUNTS: AccountSeed[] = [
  { email: 'user@aiforall.test', password: 'user123', name: 'Test User', role: 'user' },
  { email: 'admin@aiforall.test', password: 'admin123', name: 'Test Admin', role: 'admin' },
]

async function seedAccount(account: AccountSeed) {
  console.log(`\n🔧 Seeding: ${account.email} (role: ${account.role})`)

  // 1. Check if auth user already exists by listing users
  const { data: existingUsers } = await supabase.auth.admin.listUsers()
  const existing = existingUsers?.users?.find(
    (u) => u.email?.toLowerCase() === account.email.toLowerCase()
  )

  let userId: string

  if (existing) {
    console.log(`   ℹ️  Auth user already exists: ${existing.id}`)
    userId = existing.id

    // Update the password in case it changed
    const { error: updateErr } = await supabase.auth.admin.updateUserById(userId, {
      password: account.password,
      email_confirm: true,
    })
    if (updateErr) {
      console.error(`   ⚠️  Failed to update password:`, updateErr.message)
    } else {
      console.log(`   ✅ Password updated`)
    }
  } else {
    // 2. Create auth user
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email: account.email,
      password: account.password,
      email_confirm: true, // Skip email verification for test accounts
      user_metadata: { name: account.name },
    })

    if (authError) {
      console.error(`   ❌ Failed to create auth user:`, authError.message)
      return
    }

    userId = authData.user.id
    console.log(`   ✅ Auth user created: ${userId}`)
  }

  // 3. Upsert into `users` table
  const { error: usersError } = await supabase.from('users').upsert(
    {
      user_id: userId,
      auth_user_id: userId,
      username: account.name,
      email: account.email,
      role: account.role,
    },
    { onConflict: 'user_id' }
  )

  if (usersError) {
    console.error(`   ❌ Failed to upsert users row:`, usersError.message)
    return
  }
  console.log(`   ✅ users row upserted (role: ${account.role})`)
}

async function main() {
  console.log('═══════════════════════════════════════════════')
  console.log('  AI for ALL — Seed Test Accounts')
  console.log('═══════════════════════════════════════════════')
  console.log(`  Supabase URL: ${SUPABASE_URL}`)

  for (const account of ACCOUNTS) {
    await seedAccount(account)
  }

  console.log('\n═══════════════════════════════════════════════')
  console.log('  ✅ Done! Test accounts ready:')
  console.log('  • user@aiforall.test  / user123  (role: user)')
  console.log('  • admin@aiforall.test / admin123 (role: admin)')
  console.log('═══════════════════════════════════════════════\n')
}

main().catch((err) => {
  console.error('Fatal error:', err)
  process.exit(1)
})
