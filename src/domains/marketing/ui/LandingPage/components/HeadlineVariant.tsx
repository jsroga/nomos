import { LandingHeadlineLine } from '@/domains/marketing/ui/LandingPage/constants/landing-copy'

const HEADLINE_CLASS =
  'flex flex-col items-center gap-0 font-black uppercase tracking-[-0.03em] font-syne text-white text-center leading-[0.88]'

const LINE_BUILD = 'block text-[clamp(2rem,8vw,6.4rem)]'
const LINE_WORLDS = 'block text-[clamp(2.5rem,10vw,8rem)] tracking-[-0.04em]'
const LINE_BLEED =
  'block mt-2 text-[clamp(1.6rem,5.5vw,3.75rem)] tracking-[0.08em] text-primary'

/** Hero headline — solid Syne from first paint (LCP). Server-safe, no FX. */
export function HeadlineVariant() {
  return (
    <h1 className={HEADLINE_CLASS}>
      <span className={LINE_BUILD}>{LandingHeadlineLine.Build}</span>
      <span className={LINE_WORLDS}>{LandingHeadlineLine.Worlds}</span>
      <span className={LINE_BLEED}>{LandingHeadlineLine.Bleed}</span>
    </h1>
  )
}
