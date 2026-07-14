'use client'

import { BleedingText } from '@/components/BleedingText'
import { LiquidDistortionText } from '@/components/TextEffects'
import { LandingHeadlineLine } from '@/domains/marketing/ui/LandingPage/constants/landing-copy'

export function HeadlineVariant() {
  return (
    <h1 className="flex flex-col items-center gap-1 font-black uppercase tracking-[-0.02em] font-syne text-white text-center leading-[0.85]">
      <LiquidDistortionText text={LandingHeadlineLine.Build} fontSize="text-[clamp(2rem,8vw,6.4rem)]" />
      <LiquidDistortionText text={LandingHeadlineLine.Worlds} fontSize="text-[clamp(2.5rem,10vw,8rem)]" />
      <BleedingText text={LandingHeadlineLine.Bleed} />
    </h1>
  )
}
