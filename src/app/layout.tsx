import './globals.css'
import { Toaster } from 'react-hot-toast'
import { AuthProvider } from '@/components/AuthProvider'
import { createServerComponentClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { JetBrains_Mono, Inter, Syne } from 'next/font/google'
import { GlobalLiquidLoader } from '@/domains/marketing'
import ReactQueryProvider from '@/shared/data/react-query'

const inter = Inter({ subsets: ['latin'], variable: '--font-sans' })
const jetbrainsMono = JetBrains_Mono({ subsets: ['latin'], variable: '--font-mono' })
const syne = Syne({ subsets: ['latin'], variable: '--font-syne' })

import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: {
    template: '/kur/ %s',
    default: '/kur/ Build Worlds',
  },
  description: 'AI-powered infinite canvas for world generation and game development',
  icons: {
    icon: '/favicon.svg?v=9',
  },
  openGraph: {
    title: '/kur/ Build Worlds',
    description: 'AI-powered infinite canvas for world generation',
    type: 'website',
  },
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
          <ReactQueryProvider>
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
          </ReactQueryProvider>
        </AuthProvider>
      </body>
    </html>
  )
}
