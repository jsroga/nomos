import { ErrorBoundaryWrapper } from '@/components/ErrorBoundaryWrapper'
import { WORKSPACE_PAGE_TITLE } from '@/shared/data/constants/route-metadata'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: WORKSPACE_PAGE_TITLE.DASHBOARD,
}



export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-screen w-screen overflow-hidden">
      <ErrorBoundaryWrapper>

        <div className="flex-1 h-full overflow-hidden">{children}</div>
      </ErrorBoundaryWrapper>
    </div>
  )
}
