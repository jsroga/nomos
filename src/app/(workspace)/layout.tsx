import { ErrorBoundaryWrapper } from '@/components/ErrorBoundaryWrapper'
import { AppProviders } from '@/shared/auth/AppProviders'
import { WORKSPACE_PAGE_TITLE } from '@/shared/data/constants/route-metadata'
import type { Metadata } from 'next'
import NextTopLoader from 'nextjs-toploader'

export const metadata: Metadata = {
  title: WORKSPACE_PAGE_TITLE.DASHBOARD,
}

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <AppProviders>
      <NextTopLoader color="hsl(240, 85%, 65%)" showSpinner={false} />
      <div className="flex h-screen w-screen overflow-hidden font-sans">
        <ErrorBoundaryWrapper>
          <div className="h-full flex-1 overflow-hidden">{children}</div>
        </ErrorBoundaryWrapper>
      </div>
    </AppProviders>
  )
}
