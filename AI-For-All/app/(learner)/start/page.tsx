'use client'

import { useRouter } from 'next/navigation'

export default function StartPage() {
  const router = useRouter()

  return (
    <section className="onboarding-page">
      <p className="kicker">AI FOR ALL</p>
      <h2>Let&apos;s get<br/><span>you started</span></h2>
      <p>Learn how AI works through quick, interactive stories. No experience needed.</p>
      <button className="primary-button" onClick={() => router.push('/auth?mode=signup')}>Sign up</button>
      <button className="secondary-button" onClick={() => router.push('/auth?mode=signin')}>Log in</button>
      <button className="text-button" onClick={() => router.push('/stories')}>Continue as guest</button>
      <small>Accessibility and assistance</small>
      <img src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/Untitled%20design%20%2883%29%201-GfWInwvd4aNMb16ANSTiCafiREv6io.png" alt="Friendly mascot"/>
    </section>
  )
}
