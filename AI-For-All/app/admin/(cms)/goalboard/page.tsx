'use client'

import { useState } from 'react'
import { Plus, Target, Check, Edit2, Trash2 } from 'lucide-react'

export default function AdminGoalboardPage() {
  const [isAdding, setIsAdding] = useState(false)

  return (
    <div className="admin-grid">
      <section className="admin-panel story-manager" style={{ flex: 2 }}>
        <div className="panel-heading">
          <div>
            <h2>Goal Board</h2>
            <p>Manage learning goals and curriculum paths.</p>
          </div>
          {!isAdding && (
            <button className="admin-primary small" onClick={() => setIsAdding(true)}>
              <Plus size={16}/> Add Goal
            </button>
          )}
        </div>
        
        {['Understand AI Basics', 'Prompt Engineering 101', 'Ethics in AI'].map((goal, i) => (
          <div className="admin-story-row" key={goal}>
            <div className="admin-story-icon" style={{background: '#e8eaff', color: '#002169'}}><Target size={20}/></div>
            <div>
              <strong>{goal}</strong>
              <small>{i + 3} Stories required</small>
            </div>
            <div style={{marginLeft: 'auto', display: 'flex', gap: '8px'}}>
              <button className="icon-button"><Edit2 size={16}/></button>
              <button className="icon-button"><Trash2 size={16}/></button>
            </div>
          </div>
        ))}
      </section>
      
      {isAdding && (
        <section className="admin-panel" style={{ flex: 1, height: 'fit-content' }}>
          <div className="panel-heading">
            <div>
              <h2>Add Goal</h2>
              <p>Let's start with the basics</p>
            </div>
          </div>
          
          <div className="auth-form" style={{ padding: 0 }}>
            <label>Goal Title
              <input placeholder="e.g. The Last Robot"/>
            </label>
            <div style={{ display: 'flex', gap: '1rem' }}>
              <label style={{ flex: 1 }}>Number of Stories
                <select><option>1 to 5</option><option>6 to 10</option></select>
              </label>
              <label style={{ flex: 1 }}>Icon
                <select><option>Target</option><option>Star</option></select>
              </label>
            </div>
            
            <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
              <button className="outline-button" onClick={() => setIsAdding(false)}>Cancel</button>
              <button className="admin-primary" onClick={() => setIsAdding(false)}>Add</button>
            </div>
          </div>
        </section>
      )}
    </div>
  )
}
