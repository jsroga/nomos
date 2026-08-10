import { AppProviders } from '@/shared/auth/AppProviders'

// TODO: Cache Components adoption. Refactor this route so this opt-out can be removed.
// See: https://nextjs.org/docs/app/guides/migrating-to-cache-components
export const instant = false

/** Font CSS vars (Syne / Inter / JetBrains Mono) come from root layout. */
export default function AuthGroupLayout({ children }: { children: React.ReactNode }) {
  return (
    <AppProviders>
      <div className="min-h-screen font-sans">{children}</div>
    </AppProviders>
  )
}
