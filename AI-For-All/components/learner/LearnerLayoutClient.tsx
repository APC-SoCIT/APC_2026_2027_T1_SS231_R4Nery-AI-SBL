'use client'

import { useState } from 'react'
import { ArrowLeft, BookOpen, Check, ChevronRight, CircleHelp, Gift, Home, LockKeyhole, Menu, QrCode, Sparkles, Trophy, UserRound, X } from 'lucide-react'
import { usePathname, useRouter } from 'next/navigation'
import Link from 'next/link'

export function LearnerLayoutClient({ children }: { children: React.ReactNode }) {
  const [menu, setMenu] = useState(false)
  const pathname = usePathname()
  const router = useRouter()

  const isLaunch = pathname === '/'
  const showTopBar = !isLaunch
  const showBottomNav = ['/dashboard', '/stories', '/archive', '/rewards', '/profile'].some(p => pathname.startsWith(p))

  const go = (route: string) => { router.push(route); setMenu(false) }

  return (
    <div className="app-shell">
      {showTopBar && (
        <header className="topbar">
          <Link href="/" className="brand">
            <span className="brand-mark">AI</span><span>for <b>ALL</b></span>
          </Link>
          <div className="header-actions">
            <button className="icon-button" aria-label="Help"><CircleHelp size={20}/></button>
            <button className="icon-button" aria-label="Open menu" onClick={() => setMenu(!menu)}>
              {menu ? <X size={20}/> : <Menu size={20}/>}
            </button>
          </div>
        </header>
      )}
      
      {menu && (
        <div className="menu-popover">
          <button onClick={() => go('/dashboard')}>My profile</button>
          <button onClick={() => go('/archive')}>My archive</button>
          <button onClick={() => go('/rewards')}>Rewards</button>
          <a href="/admin">Admin portal</a>
        </div>
      )}

      <main className={isLaunch ? 'main-content launch-wrap' : 'main-content'}>
        {children}
      </main>

      {showBottomNav && (
        <nav className="bottom-nav">
          <Link className={pathname === '/dashboard' ? 'active' : ''} href="/dashboard">
            <Home size={19}/><span>Home</span>
          </Link>
          <Link className={pathname === '/stories' ? 'active' : ''} href="/stories">
            <BookOpen size={19}/><span>Goal Board</span>
          </Link>
          <Link className={pathname === '/archive' ? 'active' : ''} href="/archive">
            <Gift size={19}/><span>Completed Stories</span>
          </Link>
          <Link className={pathname === '/profile' ? 'active' : ''} href="/dashboard">
            <UserRound size={19}/><span>Profile</span>
          </Link>
        </nav>
      )}
    </div>
  )
}
