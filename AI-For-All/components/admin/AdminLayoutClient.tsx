'use client'

import { useState } from 'react'
import { BarChart3, BookOpen, LayoutDashboard, LogOut, Settings, Users, Target } from 'lucide-react'
import { usePathname, useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

export function AdminLayoutClient({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()
  const supabase = createClient()

  if (pathname === '/admin' || pathname === '/admin/login') {
    return <>{children}</>
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/admin/login')
  }

  const navItems = [
    { name: 'Dashboard', path: '/admin/dashboard', icon: LayoutDashboard },
    { name: 'Goalboard', path: '/admin/goalboard', icon: Target },
    { name: 'Stories', path: '/admin/stories', icon: BookOpen },
    { name: 'Learners', path: '/admin/learners', icon: Users },
    { name: 'Analytics', path: '/admin/analytics', icon: BarChart3 }
  ]

  const activeTab = navItems.find(item => pathname.startsWith(item.path))?.name || 'Overview'

  return (
    <div className="admin-shell">
      <aside className="admin-sidebar">
        <div className="brand">
          <span className="brand-mark">AI</span><span>for <b>ALL</b></span>
        </div>
        <p className="sidebar-label">WORKSPACE</p>

        {navItems.map(({ name, path, icon: Icon }) => (
          <Link
            href={path}
            key={name}
            className={pathname.startsWith(path) ? 'side-active' : ''}
          >
            <Icon size={18} /> {name}
          </Link>
        ))}

        <div className="sidebar-bottom">
          <button><Settings size={18} /> Settings</button>
          <button onClick={handleLogout}><LogOut size={18} /> Sign out</button>
        </div>
      </aside>

      <main className="admin-main">
        <header className="admin-header">
          <div>
            <p className="kicker">{activeTab.toUpperCase()}</p>
            <h1>{activeTab === 'Dashboard' ? 'Good morning, Admin.' : activeTab}</h1>
          </div>
          <div className="admin-user">
            <span>AF</span>
            <div>
              <strong>Admin</strong>
              <small>Facilitator</small>
            </div>
          </div>
        </header>
        {children}
      </main>
    </div>
  )
}
