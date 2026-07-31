import { AppProviders } from '@/shared/auth/AppProviders'
import {
  inter,
  jetbrainsMono,
} from '@/shared/data/constants/root-layout-fonts'

export default function AuthGroupLayout({ children }: { children: React.ReactNode }) {
  return (
    <AppProviders>
      <div className={`${inter.variable} ${jetbrainsMono.variable} font-sans min-h-screen`}>
        {children}
      </div>
    </AppProviders>
  )
}
