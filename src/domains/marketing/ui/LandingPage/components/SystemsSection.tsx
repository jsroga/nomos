'use client'

import { motion } from 'framer-motion'
import { LandingSectionId, LandingSystemsCopy } from '@/domains/marketing/ui/LandingPage/constants/landing-copy'
import { LANDING_DEEP_DIVES } from '@/domains/marketing/ui/LandingPage/constants/landing-deep-dives'
import {
  LANDING_REVEAL_ANIMATE,
  LANDING_REVEAL_INITIAL,
  LANDING_REVEAL_TRANSITION,
  LANDING_REVEAL_VIEWPORT,
  LANDING_SECTION_CONTAINER_CLASS,
  LANDING_SECTION_PAD_Y_CLASS,
  LANDING_SECTION_PANEL_CLASS,
} from '@/domains/marketing/ui/LandingPage/constants/landing-section'
import type { ApiIntegrationTab, SelectedFeature } from '@/domains/marketing/ui/LandingPage/types'
import { ApiMcpSection } from '@/domains/marketing/ui/LandingPage/components/ApiMcpSection'
import { BentoGrid } from '@/domains/marketing/ui/LandingPage/components/BentoGrid'
import { FeatureDeepDive } from '@/domains/marketing/ui/LandingPage/components/FeatureDeepDive'

type SystemsSectionProps = {
  activeTab: ApiIntegrationTab
  onTabChange: (tab: ApiIntegrationTab) => void
  onSelectFeature: (feature: SelectedFeature) => void
}

export function SystemsSection({
  activeTab,
  onTabChange,
  onSelectFeature,
}: SystemsSectionProps) {
  return (
    <>
      <section id={LandingSectionId.Systems} className={`${LANDING_SECTION_PANEL_CLASS} ${LANDING_SECTION_PAD_Y_CLASS}`}>
        <div className="pointer-events-none absolute bottom-0 left-1/2 top-0 hidden w-px -translate-x-1/2 bg-white/[0.06] lg:block" />

        <div className={LANDING_SECTION_CONTAINER_CLASS}>
          <motion.div
            initial={LANDING_REVEAL_INITIAL}
            whileInView={LANDING_REVEAL_ANIMATE}
            viewport={LANDING_REVEAL_VIEWPORT}
            transition={LANDING_REVEAL_TRANSITION}
            className="mb-[72px] text-center lg:text-left"
          >
            <div className="mb-8 flex items-center justify-center gap-4 lg:justify-start">
              <div className="h-px w-8 bg-[hsl(235_88%_65%)]" />
              <span className="font-mono text-[11px] uppercase tracking-[0.28em] text-[hsl(235_88%_70%)]">
                {LandingSystemsCopy.Eyebrow}
              </span>
            </div>

            <h2 className="font-syne text-[clamp(3.5rem,7vw,6rem)] font-extrabold uppercase leading-[0.92] tracking-[-0.04em]">
              <span className="text-white">{LandingSystemsCopy.TitleAi}</span>
              <span className="text-[hsl(235_88%_68%)]">{LandingSystemsCopy.TitleArsenal}</span>
            </h2>
            <p className="mt-5 font-mono text-[13px] uppercase tracking-[0.24em] text-white/[0.36]">
              {LandingSystemsCopy.Subtitle}
            </p>
          </motion.div>

          <BentoGrid onSelectFeature={onSelectFeature} />
        </div>
      </section>

      {LANDING_DEEP_DIVES.map(config => (
        <FeatureDeepDive key={config.index} {...config} />
      ))}

      <ApiMcpSection activeTab={activeTab} onTabChange={onTabChange} />
    </>
  )
}
