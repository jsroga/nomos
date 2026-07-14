import { WORKSPACE_PAGE_TITLE } from '@/shared/data/constants/route-metadata'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: WORKSPACE_PAGE_TITLE.LOOP_DESIGNER,
}

export default function LoopCreatorLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
