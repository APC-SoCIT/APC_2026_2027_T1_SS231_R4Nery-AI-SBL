'use client'

import { BookOpen, ArrowRight, Check, UserRound } from 'lucide-react'
import { useRouter } from 'next/navigation'

export default function DashboardPage() {
  const router = useRouter()

  return (
    <section className="page-section dashboard-page">
      <div className="dashboard-intro">
        <div>
          <p className="kicker">PROFILE</p>
          <h2>Hi, Learner!</h2>
          <p>Keep exploring and building your AI toolkit.</p>
        </div>
        <div className="avatar"><UserRound size={26}/></div>
      </div>
      
      <div className="dashboard-stats">
        <div><strong>3</strong><small>Stories</small></div>
        <div><strong>2</strong><small>Badges</small></div>
        <div><strong>48<span> min</span></strong><small>This week</small></div>
      </div>
      
      <button className="dashboard-action" onClick={() => router.push('/stories')}>
        <BookOpen size={24}/>
        <strong>Explore stories</strong>
        <span>Continue learning <ArrowRight size={16}/></span>
      </button>
      
      <div className="goal-card">
        <div>
          <span className="tag">GOAL BOARD</span>
          <h3>Understand AI Basics</h3>
          <p>1 of 4 stories completed</p>
        </div>
        <div className="goal-ring">25%</div>
      </div>
      
      <div className="archive-heading">
        <h3>Completed stories</h3>
        <button className="text-button" onClick={() => router.push('/archive')}>View all</button>
      </div>
      
      <div className="mini-archive">
        <div>Study Buddy <Check size={16}/></div>
        <div>Train Your Bot <Check size={16}/></div>
      </div>
    </section>
  )
}
