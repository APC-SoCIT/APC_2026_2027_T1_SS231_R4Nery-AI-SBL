import Link from 'next/link'
import type { Metadata } from 'next'
import { Accessibility } from 'lucide-react'

export const metadata: Metadata = {
  title: 'Get Started | AI for ALL',
}

export default function GetStartedPage() {
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
        <Link href="/stories" className="getstarted-guest">
          Continue as guest
        </Link>
        <p className="getstarted-a11y">
          <Accessibility size={14} /> Accessibility and assistance
        </p>
      </div>
      {/* Layered per spec: background -> blue circle -> swirly asset -> Ramsey */}
      <div className="getstarted-mascot" aria-hidden="true">
        <span className="getstarted-circle" />
        <img className="getstarted-swirl" src="/ai-for-all/swirly-for-get-started-page.png" alt="" />
        <img className="getstarted-mascot-char" src="/ai-for-all/Mascot-look-up.png" alt="" />
      </div>
    </main>
  )
}