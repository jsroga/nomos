import Link from 'next/link'
import { LandingExternalUrl, LandingHeroCopy } from '@/domains/marketing/ui/LandingPage/constants/landing-copy'
import { LANDING_SECTION_PANEL_CLASS } from '@/domains/marketing/ui/LandingPage/constants/landing-section'
import { HeadlineVariant } from '@/domains/marketing/ui/LandingPage/components/HeadlineVariant'

/** Server-rendered hero — LCP text in the first HTML response (no icon package). */
export function LandingHero() {
  return (
    <section
      className={`${LANDING_SECTION_PANEL_CLASS} min-h-[85vh] flex flex-col items-center justify-center px-6 pt-20 pb-8`}
    >
      <div className="text-center max-w-5xl mx-auto mb-12">
        <div className="mb-6">
          <HeadlineVariant />
        </div>

        <div className="flex flex-col gap-1 text-base md:text-lg text-white/70 max-w-2xl mx-auto leading-snug tracking-tight">
          <span>{LandingHeroCopy.Tagline1}</span>
          <span>{LandingHeroCopy.Tagline2}</span>
          <span className="text-primary">{LandingHeroCopy.Tagline3}</span>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row items-center gap-5">
        <Link
          prefetch={false}
          href={LandingExternalUrl.Login}
          className="group relative inline-flex items-center gap-3 px-10 py-5 text-sm font-bold text-white transition-colors duration-200 rounded-lg border border-primary/60 hover:border-primary bg-primary/20 hover:bg-primary/30 font-syne tracking-wide"
        >
          <span aria-hidden>+</span>
          {LandingHeroCopy.StartBuilding}
          <span aria-hidden className="group-hover:translate-x-1 transition-transform">
            →
          </span>
        </Link>

        <button
          type="button"
          className="group relative inline-flex items-center gap-3 px-8 py-4 text-sm font-bold text-white transition-colors duration-200 rounded-lg border border-primary/50 hover:border-primary bg-primary/10 hover:bg-primary/20 font-syne tracking-wide"
        >
          <span aria-hidden>▶</span>
          <span>{LandingHeroCopy.WatchDemo}</span>
        </button>
      </div>
    </section>
  )
}
