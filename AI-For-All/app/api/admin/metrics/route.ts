/**
 * app/api/admin/metrics/route.ts
 *
 * GET /api/admin/metrics — Fetches story reaction metrics and IBM handoff CTR stats.
 */
import { NextResponse } from 'next/server'
import { fetchStoryMetrics } from '@/lib/supabase/metrics'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const data = await fetchStoryMetrics()
    return NextResponse.json(data)
  } catch (err: any) {
    console.error('[API Metrics] Failed to fetch metrics:', err)
    return NextResponse.json(
      { error: err?.message || 'Failed to fetch metrics' },
      { status: 500 }
    )
  }
}
