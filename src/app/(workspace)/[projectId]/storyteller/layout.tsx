import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Storyteller',
}

export default function StorytellerLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
