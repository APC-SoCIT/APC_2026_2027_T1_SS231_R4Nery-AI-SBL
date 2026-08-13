import { LearnerLayoutClient } from '@/components/learner/LearnerLayoutClient'

export default function LearnerLayout({ children }: { children: React.ReactNode }) {
  return <LearnerLayoutClient>{children}</LearnerLayoutClient>
}
