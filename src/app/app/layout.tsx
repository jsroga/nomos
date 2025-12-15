import { ErrorBoundaryWrapper } from '@/components/ErrorBoundaryWrapper'

export default function AppLayout({ children }: { children: React.ReactNode }) {
    return (
        <div className="flex h-screen w-screen overflow-hidden">
            <ErrorBoundaryWrapper>
                <div className="flex-1 h-full overflow-hidden">{children}</div>
            </ErrorBoundaryWrapper>
        </div>
    )
}
