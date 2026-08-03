/** Root layout font, metadata, and OpenGraph constants. */

import {
  OpenGraphType,
  ROOT_LAYOUT_DESCRIPTION,
  ROOT_LAYOUT_OG_DESCRIPTION,
} from '@/shared/data/constants/root-layout'
import { JetBrains_Mono, Inter, Syne } from 'next/font/google'

// next/font requires statically analyzable literal arguments — the loader is
// evaluated at build time, so enum/const references break the webpack plugin.
// Syne is the landing LCP face — preload + swap. Body/mono fonts load without
// blocking critical CSS (swap + no preload).
export const inter = Inter({
  subsets: ['latin'],
  variable: '--font-sans',
  display: 'swap',
  preload: false,
  adjustFontFallback: true,
})
export const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  weight: ['400', '500', '700'],
  variable: '--font-mono',
  display: 'swap',
  preload: false,
  adjustFontFallback: true,
})
export const syne = Syne({
  subsets: ['latin'],
  weight: ['400', '700', '800'],
  variable: '--font-syne',
  display: 'swap',
  preload: true,
  adjustFontFallback: true,
})

export { ROOT_LAYOUT_DESCRIPTION, ROOT_LAYOUT_OG_DESCRIPTION, OpenGraphType }
