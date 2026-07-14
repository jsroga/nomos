/** Root layout font, metadata, and OpenGraph constants. */

import {
  OpenGraphType,
  ROOT_LAYOUT_DESCRIPTION,
  ROOT_LAYOUT_OG_DESCRIPTION,
} from '@/shared/data/constants/root-layout'
import { JetBrains_Mono, Inter, Syne } from 'next/font/google'

// next/font requires statically analyzable literal arguments — the loader is
// evaluated at build time, so enum/const references break the webpack plugin.
export const inter = Inter({ subsets: ['latin'], variable: '--font-sans' })
export const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-mono',
})
export const syne = Syne({ subsets: ['latin'], variable: '--font-syne' })

export { ROOT_LAYOUT_DESCRIPTION, ROOT_LAYOUT_OG_DESCRIPTION, OpenGraphType }
