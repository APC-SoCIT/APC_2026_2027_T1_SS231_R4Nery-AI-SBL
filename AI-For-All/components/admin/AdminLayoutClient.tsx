'use client'

import { useState, useEffect } from 'react'
import { BookOpen, LayoutDashboard, LogOut, Settings, Users, Target } from 'lucide-react'
import { usePathname, useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { getMockSession, clearMockSession } from '@/lib/mock-auth'

export function AdminLayoutClient({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()
  const supabase = createClient()
  const [adminName, setAdminName] = useState('Admin')

  useEffect(() => {
    ;(async () => {
      const mock = getMockSession()
      if (mock) {
        setAdminName(mock.name || 'Admin')
        return
      }
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        setAdminName(user.user_metadata?.display_name || 'Admin')
      }
    })()
  }, [supabase.auth, pathname])

  if (pathname === '/admin') {
    return <>{children}</>
  }

  const handleLogout = async () => {
    clearMockSession()
    await supabase.auth.signOut()
    router.push('/sign-in')
  }

  const navItems = [
    { name: 'Dashboard', path: '/admin/dashboard', icon: LayoutDashboard },
    { name: 'Goalboard', path: '/admin/goalboard', icon: Target },
    { name: 'Stories', path: '/admin/stories', icon: BookOpen },
    { name: 'Learners', path: '/admin/learners', icon: Users },
  ]

  const activeTab = navItems.find(item => pathname.startsWith(item.path))?.name
    || (pathname.startsWith('/admin/settings') ? 'Settings' : 'Overview')

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
          <Link href="/admin/settings" className={pathname.startsWith('/admin/settings') ? 'side-active' : ''}>
            <Settings size={18} /> Settings
          </Link>
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
            <span>{adminName.substring(0, 2).toUpperCase()}</span>
            <div>
              <strong>{adminName}</strong>
              <small>Facilitator</small>
            </div>
          </div>
        </header>
        {children}
      </main>
    </div>
  )
}