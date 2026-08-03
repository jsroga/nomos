import { WORKSPACE_PAGE_TITLE } from '@/shared/data/constants/route-metadata'
import type { Metadata } from 'next'

// TODO: Cache Components adoption. Refactor this route so this opt-out can be removed.
// See: https://nextjs.org/docs/app/guides/migrating-to-cache-components
export const instant = false

export const metadata: Metadata = {
  title: WORKSPACE_PAGE_TITLE.INTERIOR_DESIGN,
}

export default function InteriorDesignLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
