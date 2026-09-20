// Path: components/nav/registered-bottom-nav.tsx
import Link from 'next/link'
import { Archive, Home as HomeIcon, UserRound } from 'lucide-react'

export type RegisteredNavKey = 'home' | 'archive' | 'profile'

const items: { key: RegisteredNavKey; href: string; label: string; Icon: typeof HomeIcon }[] = [
  { key: 'home', href: '/home', label: 'Home', Icon: HomeIcon },
  { key: 'archive', href: '/archive', label: 'Archive', Icon: Archive },
  { key: 'profile', href: '/profile', label: 'Profile', Icon: UserRound },
]

// Shared across registered learner pages so size, spacing, and active treatment
// remain consistent. Goal Board intentionally lives inside the Home dashboard
// rather than as a persistent navigation destination.
export function RegisteredBottomNav({ active }: { active: RegisteredNavKey }) {
  return (
    <nav className="bottom-nav" aria-label="Primary learner navigation">
      {items.map(({ key, href, label, Icon }) => (
        <Link key={key} href={href} className={active === key ? 'active' : ''}>
          <Icon size={20} />
          <span>{label}</span>
        </Link>
      ))}
    </nav>
  )
}