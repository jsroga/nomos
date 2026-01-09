import './globals.css'
import { Toaster } from 'react-hot-toast'
import { AuthProvider } from '@/components/providers/AuthProvider'
import { createServerComponentClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { JetBrains_Mono, Inter, Syne } from 'next/font/google'
import { ErrorBoundaryWrapper } from '@/components/ErrorBoundaryWrapper'
import { GlobalLiquidLoader } from '@/domains/marketing/components/GlobalLiquidLoader'

const inter = Inter({ subsets: ['latin'], variable: '--font-sans' })
const jetbrainsMono = JetBrains_Mono({ subsets: ['latin'], variable: '--font-mono' })
const syne = Syne({ subsets: ['latin'], variable: '--font-syne' })

export const metadata = {
  title: 'Cutafonina',
  description: 'AI-powered infinite canvas for world generation',
}

import NextTopLoader from 'nextjs-toploader'

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const cookieStore = await cookies()
  // @ts-expect-error - Next 15 cookies are async but auth-helpers expects a specific type that conflicts in this version
  const supabase = createServerComponentClient({ cookies: () => cookieStore })
  const {
    data: { session },
  } = await supabase.auth.getSession()

  return (
    <html lang="en" className="dark">
      <body
        className={`${inter.variable} ${jetbrainsMono.variable} ${syne.variable} font-sans bg-background text-foreground min-h-screen`}
      >
        <NextTopLoader color="hsl(240, 85%, 65%)" showSpinner={false} />
        <AuthProvider>
          <GlobalLiquidLoader />
          {children}
          <Toaster
            position="bottom-right"
            toastOptions={{
              duration: 3000,
              style: {
                background: '#333',
                color: '#fff',
                fontFamily: 'var(--font-mono)',
              },
            }}
          />
        </AuthProvider>
      </body>
    </html>
  )
}
