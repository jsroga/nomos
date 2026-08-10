'use client'

import { motion } from 'motion/react'
import { Plus } from 'lucide-react'
import { MarketingIconType } from '@/domains/marketing/constants/three-d-icon'
import { ViewportGatedThreeDIcon } from '@/domains/marketing/ui/ViewportGatedThreeDIcon'
import { LANDING_BRAND_ACCENT } from '@/domains/marketing/ui/LandingPage/constants/landing-copy'
import {
  LANDING_ABSOLUTE_OVERLAY_CLASS,
  LANDING_SECTION_PANEL_CLASS,
} from '@/domains/marketing/ui/LandingPage/constants/landing-section'
import { LandingArchitectingCopy } from '@/domains/marketing/ui/LandingPage/constants/landing-ui-copy'

export function ArchitectingRealitySection() {
  return (
    <section className={`${LANDING_SECTION_PANEL_CLASS} px-6`}>
      <div className="max-w-7xl mx-auto mb-20 text-center">
        <motion.div initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}>
          <span className="text-[10px] font-mono text-primary tracking-[0.3em] uppercase mb-6 block">
            {LandingArchitectingCopy.Eyebrow}
          </span>
          <h2 className="text-4xl md:text-6xl lg:text-7xl font-black uppercase tracking-tight font-mono leading-[0.9]">
            <span className="text-white">{LandingArchitectingCopy.TitleArchitecting}</span>
            <span className="text-white/20">{LandingArchitectingCopy.TitleReality}</span>
          </h2>
        </motion.div>
      </div>

      <div className="max-w-7xl mx-auto relative lg:flex lg:items-center lg:gap-20">
        <motion.div
          initial={{ opacity: 0, x: -50 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
          className="hidden lg:block lg:w-1/2 relative h-[800px] -ml-20"
        >
          <div className={`${LANDING_ABSOLUTE_OVERLAY_CLASS} flex items-center justify-center`}>
            <ViewportGatedThreeDIcon
              type={MarketingIconType.StrTst}
              color={LANDING_BRAND_ACCENT}
              size={700}
              density={150}
              glowScale={0.2}
              distortion={0.1}
              mouseRotation={0.2}
              scale={0.5}
              contrast={1}
              speed={0.1}
              frequency={50}
              vignette={true}
              twist={3.5}
            />
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, x: 50 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
          className="lg:w-1/2"
        >
          <div className="bg-[#f0f0f0] rounded-sm p-12 md:p-16 text-black shadow-2xl relative overflow-hidden">
            <div className="flex flex-col gap-12 relative z-10">
              <div className="flex flex-col gap-2">
                <div className="flex items-start gap-2">
                  <span className="text-7xl md:text-8xl font-black font-syne tracking-tighter leading-none">
                    {LandingArchitectingCopy.Stat1Value}
                  </span>
                  <Plus className="w-8 h-8 text-primary mt-2" strokeWidth={4} />
                </div>
                <div className="h-px w-full bg-black/10 my-2" />
                <div className="flex flex-col">
                  <span className="font-bold text-lg">{LandingArchitectingCopy.Stat1Label}</span>
                  <span className="text-black/60 font-mono text-sm">
                    {LandingArchitectingCopy.Stat1Description}
                  </span>
                </div>
              </div>

              <div className="flex flex-col gap-2">
                <div className="flex items-start gap-2">
                  <span className="text-5xl sm:text-7xl md:text-8xl font-black font-syne tracking-tighter leading-none">
                    {LandingArchitectingCopy.Stat2Value}
                  </span>
                  <Plus className="w-8 h-8 text-primary mt-2" strokeWidth={4} />
                </div>
                <div className="h-px w-full bg-black/10 my-2" />
                <div className="flex flex-col">
                  <span className="font-bold text-lg">{LandingArchitectingCopy.Stat2Label}</span>
                  <span className="text-black/60 font-mono text-sm">
                    {LandingArchitectingCopy.Stat2Description}
                  </span>
                </div>
              </div>

              <div className="flex flex-col gap-2">
                <div className="flex items-start gap-2">
                  <span className="text-7xl md:text-8xl font-black font-syne tracking-tighter leading-none">
                    {LandingArchitectingCopy.Stat3Value}
                  </span>
                </div>
                <div className="h-px w-full bg-black/10 my-2" />
                <div className="flex flex-col">
                  <span className="font-bold text-lg">{LandingArchitectingCopy.Stat3Label}</span>
                  <span className="text-black/60 font-mono text-sm">
                    {LandingArchitectingCopy.Stat3Description}
                  </span>
                </div>
              </div>
            </div>

            <div className="absolute -bottom-20 -right-20 w-64 h-64 bg-primary/10 rounded-full blur-3xl pointer-events-none" />
          </div>
        </motion.div>
      </div>
    </section>
  )
}
