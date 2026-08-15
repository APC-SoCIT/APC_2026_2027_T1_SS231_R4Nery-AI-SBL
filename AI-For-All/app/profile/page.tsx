'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { LogOut, UserRound } from 'lucide-react'
import { clearMockSession, getMockSession, type MockUser } from '@/lib/mock-auth'
import { RegisteredBottomNav } from '@/components/nav/registered-bottom-nav'

// No Profile screenshot has been provided yet — this is a minimal, honest
// placeholder built only from confirmed data (the mock session) using the
// existing visual language, NOT a guess at your Figma layout. Send the
// Profile screenshot and this will be rebuilt to match exactly.
export default function ProfilePage() {
  const router = useRouter()
  const [user, setUser] = useState<MockUser | null | 'checking'>('checking')

  useEffect(() => {
    const session = getMockSession()
    if (!session) {
      router.replace('/sign-in')
      return
    }
    setUser(session)
  }, [router])

  if (user === 'checking' || user === null) return null

  function handleSignOut() {
    clearMockSession()
    router.push('/')
  }

  return (
    <main className="simple-page">
      <div className="simple-page-heading">
        <h2>Profile</h2>
        <p>Awaiting the approved Profile design — showing your account basics for now.</p>
      </div>

      <div className="profile-card">
        <div className="profile-avatar">
          <UserRound size={28} />
        </div>
        <div>
          <strong>{user.name}</strong>
          <small>{user.email}</small>
        </div>
      </div>

      <button type="button" className="profile-signout" onClick={handleSignOut}>
        <LogOut size={16} /> Sign out
      </button>

      <RegisteredBottomNav active="profile" />
    </main>
  )
}