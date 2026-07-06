import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Loop Designer',
}

export default function LoopCreatorLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
