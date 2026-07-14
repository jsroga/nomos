'use client'

import { motion } from 'framer-motion'
import { Map, Sparkles, Users, Zap } from 'lucide-react'
import { LandingBentoCopy } from '@/domains/marketing/ui/LandingPage/constants/landing-ui-copy'
import type { SelectedFeature } from '@/domains/marketing/ui/LandingPage/types'

type BentoGridProps = {
  onSelectFeature: (feature: SelectedFeature) => void
}

export function BentoGrid({ onSelectFeature }: BentoGridProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-4 lg:grid-cols-6 gap-4 mb-32 auto-rows-[140px]">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        whileInView={{ opacity: 1, scale: 1 }}
        viewport={{ once: true }}
        transition={{ duration: 0.5 }}
        onClick={() =>
          onSelectFeature({
            title: LandingBentoCopy.WorldGenTitle,
            subtitle: 'PROCEDURAL_ENGINE',
            description: LandingBentoCopy.WorldGenModalDescription,
            icon: Map,
          })
        }
        className="md:col-span-3 lg:col-span-3 row-span-2 rounded-xl border border-white/10 overflow-hidden group relative bg-black/40 backdrop-blur-xl hover:border-primary/50 hover:scale-[1.01] transition-all duration-300 cursor-pointer"
      >
        <div className="absolute inset-0 flex items-center justify-center opacity-[0.04] group-hover:opacity-[0.08] transition-opacity">
          <Map size={280} strokeWidth={1} />
        </div>

        <div className="absolute bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-black via-black/80 to-transparent">
          <div className="flex items-center gap-2 mb-3">
            <Map className="w-5 h-5 text-primary" />
            <span className="font-mono text-[10px] text-primary/80 tracking-widest uppercase">
              {LandingBentoCopy.WorldGenCode}
            </span>
          </div>
          <h3 className="text-2xl font-black text-white font-syne mb-2">
            {LandingBentoCopy.WorldGenTitle}
          </h3>
          <p className="text-white/60 font-mono text-xs leading-relaxed max-w-md">
            {LandingBentoCopy.WorldGenDescription}
          </p>
        </div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ delay: 0.1 }}
        onClick={() =>
          onSelectFeature({
            title: LandingBentoCopy.SceneSimTitle,
            subtitle: 'PHYSICS_ENGINE',
            description: LandingBentoCopy.SceneSimModalDescription,
            icon: Sparkles,
          })
        }
        className="md:col-span-2 lg:col-span-2 row-span-1 rounded-lg border border-white/10 overflow-hidden group relative bg-black/40 backdrop-blur-xl hover:border-primary/50 hover:scale-[1.02] transition-all duration-300 cursor-pointer"
      >
        <div className="absolute inset-0 flex items-center justify-center opacity-[0.03] group-hover:opacity-[0.08] transition-opacity">
          <Sparkles size={180} strokeWidth={1} />
        </div>

        <div className="absolute inset-0 flex flex-col justify-end p-6">
          <div className="flex items-center gap-2 mb-2">
            <Sparkles className="w-4 h-4 text-cyan-400" />
            <span className="font-mono text-[9px] text-cyan-400/80 tracking-widest uppercase">
              {LandingBentoCopy.SceneSimCode}
            </span>
          </div>
          <h3 className="text-xl font-black text-white font-syne mb-2">{LandingBentoCopy.SceneSimTitle}</h3>
          <p className="text-white/50 font-mono text-xs leading-relaxed max-w-[90%]">
            {LandingBentoCopy.SceneSimDescription}
          </p>
        </div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ delay: 0.15 }}
        onClick={() =>
          onSelectFeature({
            title: 'Team Collaboration',
            subtitle: 'MULTI_USER',
            description: LandingBentoCopy.TeamModalDescription,
            icon: Users,
          })
        }
        className="md:col-span-1 lg:col-span-1 row-span-1 rounded-lg border border-white/10 overflow-hidden group relative bg-black/40 backdrop-blur-xl hover:border-primary/50 hover:scale-[1.02] transition-all duration-300 cursor-pointer"
      >
        <div className="absolute inset-0 flex items-center justify-center opacity-[0.05] group-hover:opacity-[0.1] transition-opacity">
          <Users size={80} strokeWidth={1} />
        </div>
        <div className="absolute inset-0 flex flex-col justify-end p-4">
          <span className="font-mono text-[8px] text-violet-400/80 tracking-widest uppercase mb-1">
            {LandingBentoCopy.TeamCode}
          </span>
          <h3 className="text-sm font-black text-white font-syne mb-1">
            {LandingBentoCopy.TeamTitle}{' '}
            <span className="text-white/40 font-normal">{LandingBentoCopy.TeamSoon}</span>
          </h3>
          <p className="text-white/50 font-mono text-[10px] leading-tight">
            {LandingBentoCopy.TeamDescription}
          </p>
        </div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ delay: 0.2 }}
        onClick={() =>
          onSelectFeature({
            title: 'Loop Designer',
            subtitle: 'GAMEPLAY_LOOPS',
            description: LandingBentoCopy.LoopModalDescription,
            icon: Zap,
          })
        }
        className="md:col-span-3 lg:col-span-3 row-span-1 rounded-lg border border-white/10 overflow-hidden group relative bg-black/40 backdrop-blur-xl hover:border-primary/50 hover:scale-[1.02] transition-all duration-300 cursor-pointer"
      >
        <div className="absolute right-[-20px] top-1/2 -translate-y-1/2 opacity-[0.05] group-hover:opacity-[0.1] transition-opacity">
          <Zap size={200} strokeWidth={1} />
        </div>
        <div className="absolute inset-0 flex items-center p-6">
          <div className="max-w-md">
            <div className="flex items-center gap-2 mb-2">
              <Zap className="w-4 h-4 text-green-400" />
              <span className="font-mono text-[9px] text-green-400/80 tracking-widest uppercase">
                {LandingBentoCopy.LoopCode}
              </span>
            </div>
            <h3 className="text-xl font-black text-white font-syne mb-2">{LandingBentoCopy.LoopTitle}</h3>
            <p className="text-white/50 font-mono text-xs max-w-sm leading-relaxed">
              {LandingBentoCopy.LoopDescription}
            </p>
          </div>
        </div>
      </motion.div>
    </div>
  )
}
