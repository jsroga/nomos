'use client'

import { motion } from 'motion/react'
import type { LegacyFeature } from '@/domains/marketing/ui/LandingPage/constants/landing-features-legacy'
import { LANDING_ABSOLUTE_OVERLAY_CLASS } from '@/domains/marketing/ui/LandingPage/constants/landing-section'

export function BrutalCard({
  feature,
  index,
  className,
}: {
  feature: LegacyFeature
  index: number
  className?: string
}) {
  const Icon = feature.icon

  return (
    <motion.div
      initial={{ opacity: 0, x: -50 }}
      whileInView={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.4, delay: index * 0.08, ease: [0.25, 0.1, 0.25, 1] }}
      viewport={{ once: true, margin: '-50px' }}
      className={`group relative h-full min-h-[280px] ${className || ''}`}
    >
      <div
        className={`relative h-full border border-white/10 rounded-xl overflow-hidden backdrop-blur-sm group-hover:bg-white/[0.04] transition-colors duration-500 ${className ? '' : 'bg-white/[0.02]'}`}
      >
        <div
          className={LANDING_ABSOLUTE_OVERLAY_CLASS}
          style={{
            backgroundImage: `radial-gradient(${feature.accent || '#5c7cfa'} 1px, transparent 1px)`,
            backgroundSize: '16px 16px',
          }}
        />

        <div className="absolute -right-4 -bottom-4 opacity-[0.05] group-hover:opacity-[0.08] transition-opacity duration-500">
          <Icon size={160} strokeWidth={1} />
        </div>

        <div className="absolute inset-0 flex flex-col justify-end p-6">
          <div className="flex items-center gap-2 mb-2">
            <Icon className="w-5 h-5 text-primary" />
            <span className="font-mono text-[10px] text-primary/80 tracking-wider">
              {feature.code}
            </span>
          </div>
          <h3 className="text-xl font-black tracking-wide text-white mb-2 font-syne">
            {feature.title}
          </h3>
          <p className="text-white/70 leading-relaxed text-sm font-mono">{feature.description}</p>
        </div>
      </div>
    </motion.div>
  )
}
