import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Evaluations',
}

export default function EvalsLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
