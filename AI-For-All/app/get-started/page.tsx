'use client'

/**
 * app/get-started/page.tsx
 *
 * Entry point for new visitors.
 * "Continue as guest" calls supabase.auth.signInAnonymously() and navigates
 * to /stories — the anonymous user gets a real auth.users row (is_anonymous=true)
 * so story progress is written to user_progress under their real UUID (§6.1).
 *
 * Falls back to a simple router.push('/stories') when Supabase is not
 * configured (local dev without .env.local).
 */
import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Accessibility } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

export default function GetStartedPage() {
  const router = useRouter()
  const [guestLoading, setGuestLoading] = useState(false)

  async function handleGuest() {
    setGuestLoading(true)
    try {
      // Supabase not yet configured — dev fallback
      if (
        !process.env.NEXT_PUBLIC_SUPABASE_URL ||
        !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
      ) {
        router.push('/stories')
        return
      }

      const supabase = createClient()
      const { error } = await supabase.auth.signInAnonymously()
      if (error) {
        console.error('Anonymous sign-in failed:', error.message)
      }
      // Navigate regardless — guest browsing is always allowed
      router.push('/stories')
    } finally {
      setGuestLoading(false)
    }
  }

  return (
    <main className="getstarted-page">
      <div className="getstarted-content">
        <h2>
          Let&apos;s get
          <br />
          you started
        </h2>
        <p>Learn how AI works through quick, interactive stories. No experience needed.</p>
        <Link href="/sign-up" className="getstarted-primary">
          Sign up
        </Link>
        <Link href="/sign-in" className="getstarted-secondary">
          Log in
        </Link>
        <button
          type="button"
          className="getstarted-guest"
          onClick={handleGuest}
          disabled={guestLoading}
          aria-busy={guestLoading}
        >
          {guestLoading ? 'Starting…' : 'Continue as guest'}
        </button>
        <p className="getstarted-a11y">
          <Accessibility size={14} /> Accessibility and assistance
        </p>
      </div>
      {/* Layered per spec: background → blue circle → swirly asset → Ramsey */}
      <div className="getstarted-mascot" aria-hidden="true">
        <span className="getstarted-circle" />
        <img className="getstarted-swirl" src="/ai-for-all/swirly-for-get-started-page.png" alt="" />
        <img className="getstarted-mascot-char" src="/ai-for-all/Mascot-look-up.png" alt="" />
      </div>
    </main>
  )
}