import { ErrorBoundaryWrapper } from '@/components/ErrorBoundaryWrapper'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Dashboard',
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
