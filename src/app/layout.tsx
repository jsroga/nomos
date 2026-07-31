import './globals.css'
import {
  syne,
  ROOT_LAYOUT_DESCRIPTION,
  ROOT_LAYOUT_OG_DESCRIPTION,
  OpenGraphType,
} from '@/shared/data/constants/root-layout-fonts'
import { NodeEnv } from '@/shared/data/constants/protocol-http'

import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: {
    template: '/kur/ %s',
    default: '/kur/ Build Worlds',
  },
  description: ROOT_LAYOUT_DESCRIPTION,
  icons: {
    icon: '/favicon.svg?v=9',
  },
  openGraph: {
    title: '/kur/ Build Worlds',
    description: ROOT_LAYOUT_OG_DESCRIPTION,
    type: OpenGraphType.Website,
  },
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const isDev = process.env.NODE_ENV === NodeEnv.Development
  const DebugToolsMount = isDev
    ? (await import('@/shared/debug/DebugToolsMount')).DebugToolsMount
    : null

  return (
    <html lang="en" className="dark">
      <body
        className={`${syne.variable} bg-background text-foreground min-h-screen antialiased`}
      >
        {DebugToolsMount ? <DebugToolsMount /> : null}
        {children}
      </body>
    </html>
  )
}
