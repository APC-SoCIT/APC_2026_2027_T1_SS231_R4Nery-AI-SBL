import Link from 'next/link'
import { ChevronLeft } from 'lucide-react'

export function AuthMascotHeader({
  backHref = '/get-started',
  variant,
}: {
  backHref?: string
  variant: 'signup' | 'signin'
}) {
  return (
    <div className={`authpage-photo authpage-photo-${variant}`}>
      <Link href={backHref} className="authpage-back" aria-label="Go back">
        <ChevronLeft size={20} />
      </Link>
      <img
        className={`authpage-mascot-img ${variant}-mascot`}
        src="/ai-for-all/Mascot-look-down.png"
        alt="AI for ALL mascot"
      />
    </div>
  )
}