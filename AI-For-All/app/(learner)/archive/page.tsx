'use client'

import { ArrowLeft, ChevronRight } from 'lucide-react'
import { useRouter } from 'next/navigation'

export default function ArchivePage() {
  const router = useRouter()

  return (
    <section className="page-section archive-page">
      <button className="back-button page-back" onClick={() => router.back()}>
        <ArrowLeft size={18}/> Back
      </button>
      
      <div className="section-heading">
        <p className="kicker">MY PROFILE</p>
        <h2>My Archive</h2>
        <p>Stories you have completed and can revisit anytime.</p>
      </div>
      
      <input className="archive-search" placeholder="⌕  Search stories"/>
      
      {['Study Buddy','Train Your Bot','Trust the System?','What is AI?','How AI Helps Us'].map((title, i) => (
        <div className={`archive-stack stack-${i}`} key={title}>
          <strong>{title}</strong><span>100%</span>
          <small>{i < 2 ? 'Completed May 18, 2026' : 'Completed'}</small>
          <ChevronRight size={17}/>
        </div>
      ))}
    </section>
  )
}
