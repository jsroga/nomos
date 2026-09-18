import { ErrorBoundaryWrapper } from '@/components/ErrorBoundaryWrapper'
import { AppProviders } from '@/shared/auth/AppProviders'
import NextTopLoader from 'nextjs-toploader'

/** Workspace is session-bound — defer instant-navigation validation for now. */
export const instant = false

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <AppProviders>
      <NextTopLoader color="hsl(240, 85%, 65%)" showSpinner={false} />
      <div className="flex h-screen w-screen overflow-hidden font-sans">
        <ErrorBoundaryWrapper>
          {/* min-h-0 lets nested h-full + overflow-y-auto pages scroll instead of clipping */}
          <div className="h-full min-h-0 flex-1 overflow-hidden">{children}</div>
        </ErrorBoundaryWrapper>
      </div>
    </AppProviders>
  )
}
