import './globals.css'
import { Toaster } from 'react-hot-toast'
import { AuthProvider } from '@/components/providers/AuthProvider'
import { createServerComponentClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { JetBrains_Mono, Inter } from 'next/font/google'
import { ErrorBoundaryWrapper } from '@/components/ErrorBoundaryWrapper'

const inter = Inter({ subsets: ['latin'], variable: '--font-sans' })
const jetbrainsMono = JetBrains_Mono({ subsets: ['latin'], variable: '--font-mono' })

export const metadata = {
  title: 'World Building Kit',
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
        className={`${inter.variable} ${jetbrainsMono.variable} font-sans bg-background text-foreground flex h-screen w-screen overflow-hidden`}
      >
        <NextTopLoader color="#7c3aed" showSpinner={false} />
        <AuthProvider>
          <ErrorBoundaryWrapper>
            <div className="flex-1 h-full overflow-hidden">{children}</div>
          </ErrorBoundaryWrapper>
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
