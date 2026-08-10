'use client'

import { motion } from 'motion/react'
import { Map, Sparkles, Users, Zap } from 'lucide-react'
import {
  LANDING_REVEAL_ANIMATE,
  LANDING_REVEAL_INITIAL,
  LANDING_REVEAL_TRANSITION,
  LANDING_REVEAL_VIEWPORT,
} from '@/domains/marketing/ui/LandingPage/constants/landing-section'
import { LandingBentoCopy } from '@/domains/marketing/ui/LandingPage/constants/landing-ui-copy'
import type { SelectedFeature } from '@/domains/marketing/ui/LandingPage/types'

type BentoGridProps = {
  onSelectFeature: (feature: SelectedFeature) => void
}

const CARD_BASE =
  'rounded-[14px] border border-white/10 overflow-hidden group relative bg-black/55 cursor-pointer transition-all duration-300 hover:border-[hsl(235_88%_65%/0.55)] hover:-translate-y-[3px] hover:shadow-[0_18px_40px_-20px_hsl(235_88%_65%/0.7)]'

const GHOST_ICON = 'absolute inset-0 flex items-center justify-center opacity-[0.05] text-[hsl(235_88%_65%)]'
const INLINE_ICON = 'w-4 h-4 text-[hsl(235_88%_68%)]'
const CODE_LABEL = 'font-mono text-[10px] tracking-[0.22em] uppercase text-white/40'
const BODY =
  'font-sans text-[13px] leading-[1.55] text-white/[0.55]'

export function BentoGrid({ onSelectFeature }: BentoGridProps) {
  return (
    <div className="mb-32 grid auto-rows-[184px] grid-cols-1 gap-4 md:grid-cols-4 lg:grid-cols-6">
      <motion.div
        initial={LANDING_REVEAL_INITIAL}
        whileInView={LANDING_REVEAL_ANIMATE}
        viewport={LANDING_REVEAL_VIEWPORT}
        transition={LANDING_REVEAL_TRANSITION}
        onClick={() =>
          onSelectFeature({
            title: LandingBentoCopy.WorldGenTitle,
            subtitle: 'PROCEDURAL_ENGINE',
            description: LandingBentoCopy.WorldGenModalDescription,
            icon: Map,
          })
        }
        className={`${CARD_BASE} row-span-2 md:col-span-3 lg:col-span-3`}
      >
        <div className={GHOST_ICON}>
          <Map size={280} strokeWidth={1} />
        </div>

        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black from-[12%] via-black/82 via-[55%] to-transparent p-8">
          <div className="mb-3 flex items-center gap-2">
            <Map className={`${INLINE_ICON} h-[18px] w-[18px]`} />
            <span className={CODE_LABEL}>{LandingBentoCopy.WorldGenCode}</span>
          </div>
          <h3 className="mb-2 font-syne text-[28px] font-extrabold text-white">
            {LandingBentoCopy.WorldGenTitle}
          </h3>
          <p className={`${BODY} max-w-md text-[14px] leading-[1.6] text-white/60`}>
            {LandingBentoCopy.WorldGenDescription}
          </p>
        </div>
      </motion.div>

      <motion.div
        initial={LANDING_REVEAL_INITIAL}
        whileInView={LANDING_REVEAL_ANIMATE}
        viewport={LANDING_REVEAL_VIEWPORT}
        transition={{ ...LANDING_REVEAL_TRANSITION, delay: 0.05 }}
        onClick={() =>
          onSelectFeature({
            title: LandingBentoCopy.SceneSimTitle,
            subtitle: 'PHYSICS_ENGINE',
            description: LandingBentoCopy.SceneSimModalDescription,
            icon: Sparkles,
          })
        }
        className={`${CARD_BASE} row-span-1 md:col-span-2 lg:col-span-2`}
      >
        <div className={GHOST_ICON}>
          <Sparkles size={180} strokeWidth={1} />
        </div>

        <div className="absolute inset-0 flex flex-col justify-end p-6">
          <div className="mb-2 flex items-center gap-2">
            <Sparkles className={INLINE_ICON} />
            <span className={CODE_LABEL}>{LandingBentoCopy.SceneSimCode}</span>
          </div>
          <h3 className="mb-2 font-syne text-[22px] font-extrabold text-white">
            {LandingBentoCopy.SceneSimTitle}
          </h3>
          <p className={`${BODY} max-w-[90%]`}>{LandingBentoCopy.SceneSimDescription}</p>
        </div>
      </motion.div>

      <motion.div
        initial={LANDING_REVEAL_INITIAL}
        whileInView={LANDING_REVEAL_ANIMATE}
        viewport={LANDING_REVEAL_VIEWPORT}
        transition={{ ...LANDING_REVEAL_TRANSITION, delay: 0.08 }}
        onClick={() =>
          onSelectFeature({
            title: 'Team Collaboration',
            subtitle: 'MULTI_USER',
            description: LandingBentoCopy.TeamModalDescription,
            icon: Users,
          })
        }
        className={`${CARD_BASE} row-span-1 md:col-span-1 lg:col-span-1`}
      >
        <span className="absolute left-3 top-3 z-10 rounded-[5px] border border-white/[0.14] px-[7px] py-[3px] font-mono text-[9px] uppercase tracking-[0.18em] text-white/45">
          {LandingBentoCopy.TeamSoon}
        </span>
        <div className={GHOST_ICON}>
          <Users size={80} strokeWidth={1} />
        </div>
        <div className="absolute inset-0 flex flex-col justify-end p-4">
          <div className="mb-1 flex items-center gap-2">
            <Users className={INLINE_ICON} />
            <span className={CODE_LABEL}>{LandingBentoCopy.TeamCode}</span>
          </div>
          <h3 className="mb-1 font-syne text-[18px] font-extrabold text-white">
            {LandingBentoCopy.TeamTitle}
          </h3>
          <p className={`${BODY} text-[13px]`}>{LandingBentoCopy.TeamDescription}</p>
        </div>
      </motion.div>

      <motion.div
        initial={LANDING_REVEAL_INITIAL}
        whileInView={LANDING_REVEAL_ANIMATE}
        viewport={LANDING_REVEAL_VIEWPORT}
        transition={{ ...LANDING_REVEAL_TRANSITION, delay: 0.1 }}
        onClick={() =>
          onSelectFeature({
            title: 'Loop Designer',
            subtitle: 'GAMEPLAY_LOOPS',
            description: LandingBentoCopy.LoopModalDescription,
            icon: Zap,
          })
        }
        className={`${CARD_BASE} row-span-1 md:col-span-3 lg:col-span-3`}
      >
        <div className="absolute right-[-20px] top-1/2 -translate-y-1/2 opacity-[0.05] text-[hsl(235_88%_65%)]">
          <Zap size={200} strokeWidth={1} />
        </div>
        <div className="absolute inset-0 flex items-center p-6">
          <div className="max-w-md">
            <div className="mb-2 flex items-center gap-2">
              <Zap className={INLINE_ICON} />
              <span className={CODE_LABEL}>{LandingBentoCopy.LoopCode}</span>
            </div>
            <h3 className="mb-2 font-syne text-[24px] font-extrabold text-white">
              {LandingBentoCopy.LoopTitle}
            </h3>
            <p className={`${BODY} max-w-sm`}>{LandingBentoCopy.LoopDescription}</p>
          </div>
        </div>
      </motion.div>
    </div>
  )
}
