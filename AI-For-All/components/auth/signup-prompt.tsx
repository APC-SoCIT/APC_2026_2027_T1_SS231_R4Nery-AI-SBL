'use client'

/**
 * components/auth/signup-prompt.tsx  — Phase 2: Guest Upgrade Sheet
 *
 * Shown to anonymous guests after completing a story.
 * Offers two upgrade paths (design doc §6.1):
 *   - "Sign up with mobile number" → /sign-up
 *   - "Continue with Google"       → supabase.auth.linkIdentity({ provider: 'google' })
 *
 * Both paths retain the same auth.users UUID so user_progress is preserved
 * without any data merge step.
 *
 * Usage:
 *   <SignupPrompt open={showPrompt} onDismiss={() => setShowPrompt(false)} />
 */
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { X } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { GoogleIcon } from '@/components/auth/social-icons'

interface SignupPromptProps {
  open: boolean
  onDismiss: () => void
}

const SUPABASE_CONFIGURED =
  typeof process !== 'undefined' &&
  !!process.env.NEXT_PUBLIC_SUPABASE_URL &&
  !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

export function SignupPrompt({ open, onDismiss }: SignupPromptProps) {
  const router = useRouter()
  const [googleLoading, setGoogleLoading] = useState(false)

  if (!open) return null

  async function handleGoogle() {
    if (!SUPABASE_CONFIGURED) {
      router.push('/sign-up')
      return
    }
    setGoogleLoading(true)
    try {
      const supabase = createClient()
      // linkIdentity links Google to the current anonymous session,
      // converting the guest into a permanent user with the SAME UUID.
      // Requires "manual linking" enabled in Supabase Auth settings (§14 Q2).
      await supabase.auth.linkIdentity({
        provider: 'google',
        options: { redirectTo: `${window.location.origin}/auth/callback` },
      })
      // If linkIdentity is not enabled, fall back to /sign-up
    } catch {
      router.push('/sign-up')
    } finally {
      setGoogleLoading(false)
    }
  }

  return (
    <>
      {/* Backdrop */}
      <div
        className="signup-prompt-backdrop"
        onClick={onDismiss}
        aria-hidden="true"
      />

      {/* Bottom sheet */}
      <div
        className="signup-prompt-sheet"
        role="dialog"
        aria-modal="true"
        aria-labelledby="signup-prompt-title"
      >
        <button
          type="button"
          className="signup-prompt-close"
          onClick={onDismiss}
          aria-label="Close"
        >
          <X size={20} />
        </button>

        <div className="signup-prompt-icon" aria-hidden="true">🎉</div>

        <h2 id="signup-prompt-title" className="signup-prompt-title">
          Save your progress!
        </h2>
        <p className="signup-prompt-body">
          Create a free account to keep your story progress, earn badges,
          and pick up where you left off — on any visit.
        </p>

        <button
          type="button"
          className="signup-prompt-phone"
          onClick={() => router.push('/sign-up')}
        >
          Sign up with email
        </button>

        <button
          type="button"
          className="signup-prompt-google"
          onClick={handleGoogle}
          disabled={googleLoading}
          aria-busy={googleLoading}
        >
          <GoogleIcon />
          {googleLoading ? 'Connecting…' : 'Continue with Google'}
        </button>

        <button
          type="button"
          className="signup-prompt-skip"
          onClick={onDismiss}
        >
          Maybe later
        </button>
      </div>
    </>
  )
}
