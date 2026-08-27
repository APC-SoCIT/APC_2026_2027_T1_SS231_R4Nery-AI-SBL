'use client'

import { Users } from 'lucide-react'

export default function AdminLearnersPage() {
  return (
    <section className="admin-panel empty-admin">
      <Users size={36}/>
      <h2>Learner directory</h2>
      <p>Your learner roster will appear here once accounts are connected.</p>
      <button className="outline-button">Connect learner data</button>
    </section>
  )
}
