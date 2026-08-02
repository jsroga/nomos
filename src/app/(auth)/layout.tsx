import { AppProviders } from '@/shared/auth/AppProviders'

/** Font CSS vars (Syne / Inter / JetBrains Mono) come from root layout. */
export default function AuthGroupLayout({ children }: { children: React.ReactNode }) {
  return (
    <AppProviders>
      <div className="min-h-screen font-sans">{children}</div>
    </AppProviders>
  )
}
