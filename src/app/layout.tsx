import './globals.css'
import {
  inter,
  jetbrainsMono,
  syne,
  ROOT_LAYOUT_DESCRIPTION,
  ROOT_LAYOUT_OG_DESCRIPTION,
  ROOT_LAYOUT_TITLE_DEFAULT,
  ROOT_LAYOUT_TITLE_TEMPLATE,
  OpenGraphType,
} from '@/shared/data/constants/root-layout-fonts'
import { NodeEnv } from '@/shared/data/constants/protocol-http'
import { DebugToolsMount } from '@/shared/debug/DebugToolsMount'

import type { Metadata } from 'next'

/** Root still mounts request-time debug tooling — opt out of instant validation. */
export const instant = false

export const metadata: Metadata = {
  title: {
    template: ROOT_LAYOUT_TITLE_TEMPLATE,
    default: ROOT_LAYOUT_TITLE_DEFAULT,
  },
  description: ROOT_LAYOUT_DESCRIPTION,
  icons: {
    icon: '/favicon.svg?v=9',
  },
  openGraph: {
    title: ROOT_LAYOUT_TITLE_DEFAULT,
    description: ROOT_LAYOUT_OG_DESCRIPTION,
    type: OpenGraphType.Website,
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const isDev = process.env.NODE_ENV === NodeEnv.Development

  return (
    <html
      lang="en"
      className={`dark ${syne.variable} ${inter.variable} ${jetbrainsMono.variable}`}
    >
      <body className="min-h-screen bg-background font-sans text-foreground antialiased">
        {isDev ? <DebugToolsMount /> : null}
        {children}
      </body>
    </html>
  )
}
