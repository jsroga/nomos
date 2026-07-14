import { WORKSPACE_PAGE_TITLE } from '@/shared/data/constants/route-metadata'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: WORKSPACE_PAGE_TITLE.INFINITE_CANVAS,
}

export default function WorldGenLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
