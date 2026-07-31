import {
  MARKETING_BG_PLACEHOLDER_CLASS,
} from '@/domains/marketing/constants/viewport-3d'
import { LandingHeroAbVariant } from '@/domains/marketing/constants/hero-ab'
import { LandingClientMount } from './LandingClientMount'
import { LandingHero } from './LandingHero'
import { LandingNavStatic } from './LandingNavStatic'

type LandingPageProps = {
  readonly headlineVariant?: LandingHeroAbVariant
}

/** Server shell: hero + static nav in first HTML; heavy client work after scroll. */
export function LandingPage({
  headlineVariant = LandingHeroAbVariant.A,
}: LandingPageProps) {
  return (
    <div className="relative w-full min-h-screen text-white selection:bg-primary/30 overflow-x-hidden">
      <div className={MARKETING_BG_PLACEHOLDER_CLASS} aria-hidden />
      <LandingNavStatic />
      <LandingHero headlineVariant={headlineVariant} />
      <LandingClientMount />
    </div>
  )
}
