import type { LandingHeroHeadlineLines } from '@/domains/marketing/ui/LandingPage/constants/landing-copy'
import { LANDING_HERO_HEADLINES } from '@/domains/marketing/ui/LandingPage/constants/landing-copy'
import { LandingHeroAbVariant } from '@/domains/marketing/constants/hero-ab'

const HEADLINE_CLASS =
  'flex flex-col items-center gap-0 font-black uppercase tracking-[-0.03em] font-syne text-white text-center leading-[0.88]'

const LINE_1 = 'block text-[clamp(2rem,8vw,6.4rem)]'
const LINE_2 = 'block text-[clamp(2.5rem,10vw,8rem)] tracking-[-0.04em]'
const LINE_3 =
  'block mt-2 text-[clamp(1.6rem,5.5vw,3.75rem)] tracking-[0.08em] text-primary'

type HeadlineVariantProps = {
  readonly variant?: LandingHeroAbVariant
  readonly lines?: LandingHeroHeadlineLines
}

/** Hero headline — solid Syne from first paint (LCP). Server-safe, no FX. */
export function HeadlineVariant({
  variant = LandingHeroAbVariant.A,
  lines,
}: HeadlineVariantProps) {
  const copy = lines ?? LANDING_HERO_HEADLINES[variant]

  return (
    <h1 className={HEADLINE_CLASS}>
      <span className={LINE_1}>{copy.line1}</span>
      <span className={LINE_2}>{copy.line2}</span>
      <span className={LINE_3}>{copy.line3}</span>
    </h1>
  )
}
