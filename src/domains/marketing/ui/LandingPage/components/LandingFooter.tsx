'use client'

import { motion } from 'framer-motion'
import { ArrowRight, Plus } from 'lucide-react'
import Link from 'next/link'
import { BleedingText } from '@/components/BleedingText'
import {
  LANDING_SUBTITLES,
  LandingExternalUrl,
} from '@/domains/marketing/ui/LandingPage/constants/landing-copy'
import { LandingFooterCopy } from '@/domains/marketing/ui/LandingPage/constants/landing-ui-copy'
import { ClientOnly } from '@/domains/marketing/ui/LandingPage/components/ClientOnly'

export function LandingFooter() {
  return (
    <footer className="py-32 px-6 relative border-t border-white/5 overflow-hidden">
      <div className="absolute inset-0 z-0 bg-transparent" />
      <div className="max-w-4xl mx-auto relative z-10 text-center">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
        >
          <span className="text-[10px] font-mono text-primary tracking-[0.4em] uppercase mb-6 block">
            {LandingFooterCopy.Eyebrow}
          </span>
          <h2 className="text-5xl md:text-7xl font-black mb-6 uppercase tracking-tighter font-syne">
            {LandingFooterCopy.TitleLine1}
            <br />
            <span className="text-primary">{LandingFooterCopy.TitleLine2}</span>
          </h2>
          <div className="flex justify-center h-8 mb-12">
            <ClientOnly>
              <BleedingText
                text={LANDING_SUBTITLES[Math.floor(Math.random() * LANDING_SUBTITLES.length)]}
                className="text-sm font-mono tracking-wide uppercase"
                textColor="text-red-500/90"
                particleColor="text-red-500"
              />
            </ClientOnly>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.2 }}
          className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-16"
        >
          <Link
            href={LandingExternalUrl.Login}
            className="group relative inline-flex items-center gap-3 px-8 py-4 text-sm font-bold text-white transition-all duration-300 rounded-lg overflow-hidden border border-primary/60 hover:border-primary bg-primary/20 hover:bg-primary/30 backdrop-blur-sm shadow-[0_0_30px_-10px_rgba(92,124,250,0.4)] hover:shadow-[0_0_40px_-8px_rgba(92,124,250,0.6)] hover:scale-[1.03] font-syne tracking-wide"
          >
            <Plus className="w-4 h-4" />
            {LandingFooterCopy.StartBuilding}
            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </Link>
          <Link
            href={LandingExternalUrl.ApiDocs}
            target="_blank"
            rel="noopener noreferrer"
            className="group inline-flex items-center gap-2 px-6 py-4 text-sm font-bold text-white/60 hover:text-white transition-all duration-300 border border-transparent hover:border-white/10 rounded-lg hover:bg-white/5 font-mono"
          >
            {LandingFooterCopy.ReadDocs}
            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </Link>
        </motion.div>

        <div className="flex justify-center gap-8 mt-12 text-[10px] font-mono tracking-widest text-white/40">
          <Link href={LandingExternalUrl.Terms} className="hover:text-primary transition-colors">
            {LandingFooterCopy.Terms}
          </Link>
          <Link href={LandingExternalUrl.Privacy} className="hover:text-primary transition-colors">
            {LandingFooterCopy.Privacy}
          </Link>
        </div>
      </div>
    </footer>
  )
}
