import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Deduction Puzzle',
}

export default function DeductionPuzzleLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
