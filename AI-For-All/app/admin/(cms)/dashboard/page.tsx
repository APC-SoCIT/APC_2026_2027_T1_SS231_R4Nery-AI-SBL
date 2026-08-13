'use client'

import { BarChart3, BookOpen, Check, ChevronRight, Plus, Users } from 'lucide-react'
import { useRouter } from 'next/navigation'

export default function AdminDashboardPage() {
  const router = useRouter()

  return (
    <>
      <div className="admin-stats">
        <div className="stat-card">
          <span className="stat-icon"><Users/></span><small>Active learners</small>
          <strong>128</strong><span className="stat-trend"><Check size={13}/> +12% this week</span>
        </div>
        <div className="stat-card">
          <span className="stat-icon"><BookOpen/></span><small>Stories completed</small>
          <strong>342</strong><span className="stat-trend"><Check size={13}/> +8% this week</span>
        </div>
        <div className="stat-card">
          <span className="stat-icon"><BarChart3/></span><small>Avg. engagement</small>
          <strong>74%</strong><span className="stat-trend"><Check size={13}/> +5% this week</span>
        </div>
      </div>
      
      <div className="admin-grid">
        <section className="admin-panel">
          <div className="panel-heading">
            <div>
              <h2>Learner activity</h2>
              <p>Completions across your programs</p>
            </div>
            <select><option>Last 7 days</option><option>Last 30 days</option></select>
          </div>
          <div className="chart-bars">
            {[44, 62, 52, 78, 68, 88, 72].map((height, i) => (
              <div className="bar-wrap" key={i}>
                <div className="bar" style={{ height: `${height}%` }}/>
                <small>{['M','T','W','T','F','S','S'][i]}</small>
              </div>
            ))}
          </div>
        </section>
        
        <section className="admin-panel">
          <div className="panel-heading">
            <div>
              <h2>Quick actions</h2>
              <p>Keep your content fresh</p>
            </div>
          </div>
          <button className="quick-action" onClick={() => router.push('/admin/stories')}>
            <span><Plus size={18}/></span>
            <div><strong>Create a story</strong><small>Build a new learning path</small></div>
            <ChevronRight size={18}/>
          </button>
          <button className="quick-action" onClick={() => router.push('/admin/learners')}>
            <span><Users size={18}/></span>
            <div><strong>View learners</strong><small>See progress and milestones</small></div>
            <ChevronRight size={18}/>
          </button>
        </section>
      </div>
    </>
  )
}
