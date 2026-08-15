'use client'

import { useState } from 'react'
import { ChevronRight } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export default function AdminLoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string|null>(null)
  
  const supabase = createClient()

  const handleLogin = async () => {
    setLoading(true)
    setError(null)
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password
      })
      if (error) throw error
      router.push('/admin/dashboard')
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="admin-login">
      <div className="admin-login-card">
        <div className="brand admin-brand">
          <span className="brand-mark">AI</span><span>for <b>ALL</b></span>
        </div>
        <p className="kicker">FACILITATOR PORTAL</p>
        <h1>Welcome back.</h1>
        <p>Manage stories, track learning, and help every learner feel at home with AI.</p>
        
        <label>Email
          <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@example.com"/>
        </label>
        
        <label>Password
          <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Enter password"/>
        </label>
        
        {error && <p style={{color: 'red', fontSize: '0.9rem'}}>{error}</p>}
        
        <button className="admin-primary" onClick={handleLogin} disabled={loading}>
          {loading ? 'Signing in...' : 'Sign in'} <ChevronRight size={17}/>
        </button>
        
        <a href="/" className="back-home">Return to learner experience</a>
      </div>
    </main>
  )
}
