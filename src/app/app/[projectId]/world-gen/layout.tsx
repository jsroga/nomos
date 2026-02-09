import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Infinite Canvas',
}

export default function WorldGenLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
