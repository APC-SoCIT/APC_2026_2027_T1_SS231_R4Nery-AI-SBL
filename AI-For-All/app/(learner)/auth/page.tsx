'use client'

import { useState, Suspense } from 'react'
import { ChevronRight } from 'lucide-react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

const mascot = 'https://hebbkx1anhila5yf.public.blob.vercel-storage.com/u%201-iNRGaghtYtdeXSHFa2XQPl2ryeu5Fm.png'

function AuthForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const defaultMode = searchParams.get('mode') === 'signin' ? 'signin' : 'signup'
  const [mode, setMode] = useState<'signup' | 'signin'>(defaultMode)
  
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string|null>(null)

  const supabase = createClient()

  const handleAuth = async () => {
    setLoading(true)
    setError(null)
    try {
      if (mode === 'signup') {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: { full_name: name }
          }
        })
        if (error) throw error
        router.push('/profile/setup')
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password
        })
        if (error) throw error
        router.push('/dashboard')
      }
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <section className="auth-page">
      <div className="auth-art">
        <img src={mascot} alt="AI for ALL mascot"/>
        <h2>{mode === 'signup' ? 'Ready to Learn AI?' : 'Hey There, You’re Back!'}</h2>
      </div>
      <div className="auth-form">
        <p className="kicker">{mode === 'signup' ? 'CREATE YOUR ACCOUNT' : 'WELCOME BACK'}</p>
        
        {mode === 'signup' && (
          <label>Your Name
            <input value={name} onChange={e => setName(e.target.value)} placeholder="Enter your name"/>
          </label>
        )}
        <label>Email
          <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@example.com"/>
        </label>
        <label>Password
          <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••"/>
        </label>
        
        {error && <p style={{color: 'red', fontSize: '0.9rem'}}>{error}</p>}

        <button className="primary-button" onClick={handleAuth} disabled={loading}>
          {loading ? 'Processing...' : (mode === 'signup' ? 'I’m Ready' : 'Login')} <ChevronRight size={17}/>
        </button>
        <button className="text-button" onClick={() => setMode(mode === 'signup' ? 'signin' : 'signup')}>
          {mode === 'signup' ? 'Already have an account? Sign in' : 'Need an account? Sign up'}
        </button>
      </div>
    </section>
  )
}

export default function AuthPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <AuthForm />
    </Suspense>
  )
}
