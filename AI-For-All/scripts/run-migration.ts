/**
 * scripts/run-migration.ts
 *
 * Runs the migrate-erd.sql file against the Supabase database.
 * Uses the Supabase Management API (SQL endpoint) via the service role key.
 *
 * Usage: npx tsx scripts/run-migration.ts
 */

import * as dotenv from 'dotenv'
import * as path from 'path'
import * as fs from 'fs'

dotenv.config({ path: path.resolve(__dirname, '..', '.env.local') })

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error('❌ Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local')
  process.exit(1)
}

// Extract project ref from URL (e.g., https://abc123.supabase.co → abc123)
const projectRef = new URL(SUPABASE_URL).hostname.split('.')[0]

async function runSQL(sql: string, label: string): Promise<boolean> {
  console.log(`\n🔧 Running: ${label}...`)

  // Use the Supabase Management API to run SQL
  const response = await fetch(`https://api.supabase.com/v1/projects/${projectRef}/database/query`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
    },
    body: JSON.stringify({ query: sql }),
  })

  if (!response.ok) {
    const text = await response.text()
    console.error(`   ❌ Failed (${response.status}): ${text.slice(0, 500)}`)
    return false
  }

  console.log(`   ✅ Success`)
  return true
}

async function main() {
  const sqlPath = path.resolve(__dirname, '..', 'migrate-erd.sql')
  const sql = fs.readFileSync(sqlPath, 'utf-8')

  console.log('═══════════════════════════════════════════════')
  console.log('  AI for ALL — Run ERD Migration')
  console.log('═══════════════════════════════════════════════')
  console.log(`  Supabase URL: ${SUPABASE_URL}`)
  console.log(`  Project Ref: ${projectRef}`)
  console.log('')

  const success = await runSQL(sql, 'Full migration')
  
  if (!success) {
    console.log('\n⚠️  Management API not available (this is normal for anon/service role keys).')
    console.log('   Please run the migration SQL manually in the Supabase SQL Editor:')
    console.log('')
    console.log('   1. Go to https://supabase.com/dashboard/project/' + projectRef + '/sql')
    console.log('   2. Copy and paste the contents of migrate-erd.sql')
    console.log('   3. Click "Run"')
    console.log('')
    console.log('   After running the migration, seed the accounts:')
    console.log('   npx tsx scripts/seed-accounts.ts')
  }
}

main().catch((err) => {
  console.error('Fatal error:', err)
  process.exit(1)
})
