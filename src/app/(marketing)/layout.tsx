import { jetbrainsMono } from '@/shared/data/constants/root-layout-fonts'

/** Public marketing — Syne from root; JetBrains Mono for body/eyebrow copy on `/`. */
export default function MarketingLayout({ children }: { children: React.ReactNode }) {
  return <div className={`${jetbrainsMono.variable} min-h-screen`}>{children}</div>
}
