'use client'

import { useState } from 'react'
import { ArrowLeft, Check, QrCode, Trophy } from 'lucide-react'
import { useRouter } from 'next/navigation'

export default function RewardsPage() {
  const router = useRouter()
  const [claimed, setClaimed] = useState(false)

  return (
    <section className="page-section rewards-page">
      <button className="back-button page-back" onClick={() => router.back()}>
        <ArrowLeft size={18}/> Back
      </button>
      
      <div className="section-heading">
        <p className="kicker">MY REWARDS</p>
        <h2>Celebrate your wins</h2>
      </div>
      
      <div className="badge-card">
        <div className="badge-medal"><Trophy size={30}/></div>
        <div>
          <span className="tag">EARNED</span>
          <h3>Curious Explorer</h3>
          <p>Completed your first AI story.</p>
        </div>
        <Check className="badge-check" size={22}/>
      </div>
      
      <div className="reward-row">
        <div className="reward-symbol"><QrCode size={22}/></div>
        <div>
          <strong>Learning kit</strong>
          <p>Claim your reward from your facilitator.</p>
        </div>
        <button className="outline-button" onClick={() => setClaimed(true)}>
          {claimed ? 'Claimed' : 'Claim'}
        </button>
      </div>
      
      {claimed && (
        <div className="claim-modal">
          <div className="qr-box"><QrCode size={74}/></div>
          <h3>Ready to claim</h3>
          <p>Show this code to your facilitator.</p>
        </div>
      )}
    </section>
  )
}
