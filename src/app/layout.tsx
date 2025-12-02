import './globals.css'
import { Toaster } from 'react-hot-toast'
import { GlobalSidebar } from '@/components/GlobalSidebar'

export const metadata = {
  title: 'World Building Kit',
  description: 'AI-powered infinite canvas for world generation',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="flex h-screen w-screen overflow-hidden">
        <GlobalSidebar />
        <div className="flex-1 h-full overflow-hidden">
            {children}
        </div>
        <Toaster
          position="bottom-right"
          toastOptions={{
            duration: 3000,
            style: {
              background: '#363636',
              color: '#fff',
            },
            success: {
              iconTheme: {
                primary: '#10b981',
                secondary: '#fff',
              },
            },
            error: {
              iconTheme: {
                primary: '#ef4444',
                secondary: '#fff',
              },
            },
          }}
        />
      </body>
    </html>
  )
}
