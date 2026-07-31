'use client'

import { Toaster } from 'react-hot-toast'
import { AuthProvider } from '@/components/AuthProvider'
import ReactQueryProvider from '@/shared/data/react-query'

/** Auth + React Query + toasts — workspace/auth only (not marketing). */
export function AppProviders({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <ReactQueryProvider>
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
  )
}
