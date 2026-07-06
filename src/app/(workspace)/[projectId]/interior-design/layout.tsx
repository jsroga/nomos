import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Interior Design',
}

export default function InteriorDesignLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
