import { WORKSPACE_PAGE_TITLE } from '@/shared/data/constants/route-metadata'
import type { Metadata } from 'next'

/** Session-bound project list — defer instant-navigation validation. */
export const instant = false

export const metadata: Metadata = {
  title: WORKSPACE_PAGE_TITLE.PROJECTS,
}

export default function ProjectsLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
