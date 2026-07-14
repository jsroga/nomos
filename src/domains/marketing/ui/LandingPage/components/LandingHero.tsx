'use client'

import { motion, type MotionValue } from 'framer-motion'
import { ArrowRight, Play, Plus } from 'lucide-react'
import Link from 'next/link'
import { LandingExternalUrl, LandingHeroCopy } from '@/domains/marketing/ui/LandingPage/constants/landing-copy'
import { HeadlineVariant } from '@/domains/marketing/ui/LandingPage/components/HeadlineVariant'

type LandingHeroProps = {
  isLoggedIn: boolean
  heroY: MotionValue<number>
  heroOpacity: MotionValue<number>
}

export function LandingHero({ isLoggedIn, heroY, heroOpacity }: LandingHeroProps) {
  return (
    <motion.section
      style={{ y: heroY, opacity: heroOpacity }}
      className="relative min-h-[85vh] flex flex-col items-center justify-center px-6 pt-20 pb-8"
    >
      <div className="text-center max-w-5xl mx-auto mb-12">
        <div className="min-h-[160px] md:min-h-[240px] flex items-center justify-center mb-6">
          <HeadlineVariant />
        </div>

        <div className="flex flex-col gap-1 text-base md:text-lg text-white/70 max-w-2xl mx-auto leading-snug font-mono tracking-tight">
          <span>{LandingHeroCopy.Tagline1}</span>
          <span>{LandingHeroCopy.Tagline2}</span>
          <span className="text-primary">{LandingHeroCopy.Tagline3}</span>
        </div>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.8 }}
        className="flex flex-col sm:flex-row items-center gap-5"
      >
        <Link
          href={isLoggedIn ? LandingExternalUrl.Projects : LandingExternalUrl.Login}
          className="group relative inline-flex items-center gap-3 px-10 py-5 text-sm font-bold text-white transition-all duration-300 rounded-lg overflow-hidden border border-primary/60 hover:border-primary bg-primary/20 hover:bg-primary/30 backdrop-blur-sm shadow-[0_0_30px_-10px_rgba(92,124,250,0.4)] hover:shadow-[0_0_40px_-8px_rgba(92,124,250,0.6)] hover:scale-[1.03] font-syne tracking-wide"
        >
          <Plus className="w-4 h-4" />
          {LandingHeroCopy.StartBuilding}
          <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
        </Link>

        <button className="group relative inline-flex items-center gap-3 px-8 py-4 text-sm font-bold text-white transition-all duration-300 rounded-lg overflow-hidden border border-primary/50 hover:border-primary bg-primary/10 hover:bg-primary/20 backdrop-blur-sm hover:shadow-[0_0_20px_-5px_rgba(92,124,250,0.5)] hover:scale-[1.02] font-syne tracking-wide">
          <Play className="relative z-10 w-4 h-4" />
          <span className="relative z-10">{LandingHeroCopy.WatchDemo}</span>
        </button>
      </motion.div>
    </motion.section>
  )
}
