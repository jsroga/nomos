/** Root layout font, metadata, and OpenGraph constants. */

import {
  OpenGraphType,
  ROOT_LAYOUT_DESCRIPTION,
  ROOT_LAYOUT_OG_DESCRIPTION,
} from '@/shared/data/constants/root-layout'
import { JetBrains_Mono, Inter, Syne } from 'next/font/google'

// next/font requires statically analyzable literal arguments — the loader is
// evaluated at build time, so enum/const references break the webpack plugin.
// `block` avoids FOUT (fallback → webfont flash). Self-hosted + preload keeps
// the brief block period near-zero. `adjustFontFallback` matches metrics.
export const inter = Inter({
  subsets: ['latin'],
  variable: '--font-sans',
  display: 'block',
  preload: true,
  adjustFontFallback: true,
})
export const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  weight: ['400', '500', '700'],
  variable: '--font-mono',
  display: 'block',
  preload: true,
  adjustFontFallback: true,
})
export const syne = Syne({
  subsets: ['latin'],
  weight: ['400', '700', '800'],
  variable: '--font-syne',
  display: 'block',
  preload: true,
  adjustFontFallback: true,
})

export { ROOT_LAYOUT_DESCRIPTION, ROOT_LAYOUT_OG_DESCRIPTION, OpenGraphType }
