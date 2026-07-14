'use client'

import { motion } from 'framer-motion'
import { LandingSectionId, LandingSystemsCopy } from '@/domains/marketing/ui/LandingPage/constants/landing-copy'
import { LANDING_DEEP_DIVES } from '@/domains/marketing/ui/LandingPage/constants/landing-deep-dives'
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
    <section id={LandingSectionId.Systems} className="py-32 px-6 relative">
      <div className="absolute left-1/2 top-0 bottom-0 w-px bg-white/5 hidden lg:block -translate-x-1/2" />

      <div className="max-w-7xl mx-auto mb-20 text-center lg:text-left">
        <motion.div
          initial={{ opacity: 0, x: -50 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true }}
          className="flex items-center justify-center lg:justify-start gap-4 mb-8"
        >
          <div className="w-8 h-px bg-primary" />
          <span className="text-xs font-mono text-primary uppercase tracking-widest">
            {LandingSystemsCopy.Eyebrow}
          </span>
        </motion.div>

        <motion.h2
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-5xl md:text-7xl lg:text-8xl font-black uppercase tracking-tighter font-mono"
        >
          <span className="text-white">{LandingSystemsCopy.TitleAi}</span>
          <span className="text-primary">{LandingSystemsCopy.TitleArsenal}</span>
        </motion.h2>
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.1 }}
          className="text-sm md:text-base font-mono text-white/40 mt-4 tracking-widest"
        >
          {LandingSystemsCopy.Subtitle}
        </motion.p>
      </div>

      <div className="max-w-7xl mx-auto">
        <BentoGrid onSelectFeature={onSelectFeature} />

        <div className="space-y-12">
          {LANDING_DEEP_DIVES.map(config => (
            <FeatureDeepDive key={config.index} {...config} />
          ))}
          <ApiMcpSection activeTab={activeTab} onTabChange={onTabChange} />
        </div>
      </div>
    </section>
  )
}
