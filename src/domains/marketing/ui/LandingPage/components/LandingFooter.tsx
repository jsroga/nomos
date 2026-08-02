'use client'

import { ArrowRight, Plus } from 'lucide-react'
import Link from 'next/link'
import {
  LandingExternalUrl,
} from '@/domains/marketing/ui/LandingPage/constants/landing-copy'
import { LANDING_SECTION_PAD_Y_CLASS, LANDING_SECTION_PANEL_CLASS } from '@/domains/marketing/ui/LandingPage/constants/landing-section'
import { LandingFooterCopy } from '@/domains/marketing/ui/LandingPage/constants/landing-ui-copy'

export function LandingFooter() {
  return (
    <footer className={`${LANDING_SECTION_PANEL_CLASS} ${LANDING_SECTION_PAD_Y_CLASS}`}>
      <div className="relative z-10 mx-auto w-full max-w-4xl px-6 text-center">
        <span className="text-[10px] font-mono text-primary tracking-[0.4em] uppercase mb-6 block">
          {LandingFooterCopy.Eyebrow}
        </span>
        <h2 className="text-5xl md:text-7xl font-black mb-12 uppercase tracking-tighter font-syne">
          {LandingFooterCopy.TitleLine1}
          <br />
          <span className="text-primary">{LandingFooterCopy.TitleLine2}</span>
        </h2>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-16">
          <Link
            prefetch={false}
            href={LandingExternalUrl.Login}
            className="group relative inline-flex items-center gap-3 px-8 py-4 text-sm font-bold text-white transition-colors duration-200 rounded-lg border border-primary/60 hover:border-primary bg-primary/20 hover:bg-primary/30 font-syne tracking-wide"
          >
            <Plus className="w-4 h-4" />
            {LandingFooterCopy.StartBuilding}
            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </Link>
          <Link
            prefetch={false}
            href={LandingExternalUrl.ApiDocs}
            target="_blank"
            rel="noopener noreferrer"
            className="group inline-flex items-center gap-2 px-6 py-4 text-sm font-bold text-white/60 hover:text-white transition-colors duration-200 border border-transparent hover:border-white/10 rounded-lg hover:bg-white/5 font-mono"
          >
            {LandingFooterCopy.ReadDocs}
            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </Link>
        </div>

        <div className="flex justify-center gap-8 mt-12 text-[10px] font-mono tracking-widest text-white/40">
          <Link prefetch={false} href={LandingExternalUrl.Terms} className="hover:text-primary transition-colors">
            {LandingFooterCopy.Terms}
          </Link>
          <Link prefetch={false} href={LandingExternalUrl.Privacy} className="hover:text-primary transition-colors">
            {LandingFooterCopy.Privacy}
          </Link>
        </div>
      </div>
    </footer>
  )
}
