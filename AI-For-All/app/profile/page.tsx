'use client'

/**
 * app/profile/page.tsx
 *
 * Backward-compatibility redirect.
 * /profile  →  /account/profile  (the real Supabase-backed profile page).
 */
import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function ProfileRedirect() {
  const router = useRouter()
  useEffect(() => {
    router.replace('/account/profile')
  }, [router])
  return null
}