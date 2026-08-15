'use client'

import { useRouter } from 'next/navigation'

export default function ProfileSetupPage() {
  const router = useRouter()

  return (
    <section className="profile-setup">
      <p className="kicker">PROFILE CREATED</p>
      <h2>You&apos;re all set, <span>Learner!</span></h2>
      <p>Your profile is ready. Your stories, and progress can now be saved.</p>
      <img src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/Untitled%20design%20%2892%29%201-aiKRFyLKe0eeImvRr0FlBHR6wrS7WD.png" alt="Mascot celebrating"/>
      <button className="primary-button" onClick={() => router.push('/dashboard')}>Continue</button>
    </section>
  )
}
