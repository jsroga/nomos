import {
  MARKETING_BG_PLACEHOLDER_CLASS,
} from '@/domains/marketing/constants/viewport-3d'
import { LandingClientMount } from './LandingClientMount'
import { LandingHero } from './LandingHero'
import { LandingNavStatic } from './LandingNavStatic'

/** Server shell: hero + static nav in first HTML; heavy client work after scroll. */
export function LandingPage() {
  return (
    <div className="relative w-full min-h-screen text-white selection:bg-primary/30 overflow-x-hidden">
      <div className={MARKETING_BG_PLACEHOLDER_CLASS} aria-hidden />
      <LandingNavStatic />
      <LandingHero />
      <LandingClientMount />
    </div>
  )
}
