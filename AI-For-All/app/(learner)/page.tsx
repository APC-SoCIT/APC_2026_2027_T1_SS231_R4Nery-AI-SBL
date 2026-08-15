'use client'

import { ArrowRight } from 'lucide-react'
import { useRouter } from 'next/navigation'

const mascot = 'https://hebbkx1anhila5yf.public.blob.vercel-storage.com/u%201-iNRGaghtYtdeXSHFa2XQPl2ryeu5Fm.png'

export default function LaunchPage() {
  const router = useRouter()
  return (
    <section className="launch-page">
      <div className="launch-copy">
        <div className="brand launch-brand">
          <span className="brand-mark">AI</span><span>for <b>ALL</b></span>
        </div>
        <h1>Learn AI<br/><em>through</em><br/>stories</h1>
        <button className="launch-button" onClick={() => router.push('/start')}>
          start here <ArrowRight size={16}/>
        </button>
      </div>
      <img className="launch-mascot" src={mascot} alt="AI for ALL mascot"/>
    </section>
  )
}
