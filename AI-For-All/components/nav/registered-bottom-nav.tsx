import Link from 'next/link'
import { Archive, Home as HomeIcon, Target, UserRound } from 'lucide-react'

export type RegisteredNavKey = 'home' | 'goals' | 'archive' | 'profile'

const items: { key: RegisteredNavKey; href: string; label: string; Icon: typeof HomeIcon }[] = [
  { key: 'home', href: '/home', label: 'Home', Icon: HomeIcon },
  { key: 'goals', href: '/goals', label: 'Goal Board', Icon: Target },
  { key: 'archive', href: '/archive', label: 'Archive', Icon: Archive },
  { key: 'profile', href: '/profile', label: 'Profile', Icon: UserRound },
]

// Shared across Home / Goal Board / Archive / Profile so size, spacing, and
// labels stay identical everywhere — only `active` changes per page.
export function RegisteredBottomNav({ active }: { active: RegisteredNavKey }) {
  return (
    <nav className="bottom-nav">
      {items.map(({ key, href, label, Icon }) => (
        <Link key={key} href={href} className={active === key ? 'active' : ''}>
          <Icon size={19} />
          <span>{label}</span>
        </Link>
      ))}
    </nav>
  )
}