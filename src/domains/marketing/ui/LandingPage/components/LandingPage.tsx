import {
  MARKETING_BG_PLACEHOLDER_CLASS,
} from '@/domains/marketing/constants/viewport-3d'
import { LandingHeroAbVariant } from '@/domains/marketing/constants/hero-ab'
import { LandingClientMount } from './LandingClientMount'
import { LandingHero } from './LandingHero'
import { LandingNavClient } from './LandingNavClient'

type LandingPageProps = {
  readonly headlineVariant?: LandingHeroAbVariant
}

/** Server shell: hero + nav in first HTML; heavy client work after scroll. */
export function LandingPage({
  headlineVariant = LandingHeroAbVariant.A,
}: LandingPageProps) {
  return (
    <div className="relative min-h-screen w-full overflow-x-hidden text-white selection:bg-primary/30">
      <div className={MARKETING_BG_PLACEHOLDER_CLASS} aria-hidden />
      <LandingNavClient />
      <LandingHero headlineVariant={headlineVariant} />
      <LandingClientMount />
    </div>
  )
}

