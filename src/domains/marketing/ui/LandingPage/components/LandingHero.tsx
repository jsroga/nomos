import Link from 'next/link'
import { LandingHeroAbVariant } from '@/domains/marketing/constants/hero-ab'
import {
  LandingExternalUrl,
  LandingHeroCopy,
  LandingHeroDomId,
} from '@/domains/marketing/ui/LandingPage/constants/landing-copy'
import { LANDING_SECTION_CONTAINER_CLASS } from '@/domains/marketing/ui/LandingPage/constants/landing-section'
import { HeadlineVariant } from '@/domains/marketing/ui/LandingPage/components/HeadlineVariant'
import { MarketingVoiceLine } from '@/domains/marketing/ui/MarketingVoiceLine'

type LandingHeroProps = {
  readonly headlineVariant?: LandingHeroAbVariant
}

/** Server-rendered hero — LCP text in the first HTML response (no icon / Three packages). */
export function LandingHero({ headlineVariant = LandingHeroAbVariant.A }: LandingHeroProps) {
  return (
    <section className="relative z-10 flex h-svh min-h-svh flex-col items-center justify-center overflow-hidden bg-[hsl(240_10%_3.9%)] pb-14 pt-[120px]">
      <div
        id={LandingHeroDomId.TerrainSlot}
        className="pointer-events-none absolute inset-0 opacity-[0.38] [mask-image:linear-gradient(to_bottom,transparent_0%,black_62%,rgba(0,0,0,0.45)_100%)]"
      />

      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(62%_62%_at_50%_48%,rgba(5,5,7,0.9)_0%,rgba(5,5,7,0.6)_58%,transparent_82%)]"
      />

      <div className={`${LANDING_SECTION_CONTAINER_CLASS} flex flex-col items-center text-center`}>
        <div className="flex max-w-5xl flex-col items-center gap-[26px]">
          <MarketingVoiceLine />
          <HeadlineVariant variant={headlineVariant} />
          <div className="flex max-w-[620px] flex-col items-center gap-3">
            <p className="font-sans text-[20px] leading-[1.5] text-white/[0.66]">
              {LandingHeroCopy.SubCopy}
            </p>
            <p className="font-mono text-[11px] uppercase tracking-[0.26em] text-white/[0.34]">
              {LandingHeroCopy.MetaLine}
            </p>
          </div>
        </div>

        <div className="mt-11 flex items-center justify-center">
          <Link
            prefetch={false}
            href={LandingExternalUrl.Login}
            className="group inline-flex h-[66px] items-center gap-3.5 rounded-xl bg-[hsl(235_92%_68%)] px-[42px] font-syne text-[16px] font-extrabold uppercase tracking-[0.09em] text-white shadow-[0_0_0_1px_hsl(235_92%_78%/0.5),0_18px_60px_-10px_hsl(235_92%_68%/0.95)] transition-all duration-200 hover:-translate-y-0.5 hover:bg-[hsl(235_92%_74%)] hover:shadow-[0_0_0_1px_hsl(235_92%_78%/0.5),0_24px_70px_-8px_hsl(235_92%_68%/0.95)]"
          >
            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" aria-hidden>
              <path
                d="M12 5v14M5 12h14"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
              />
            </svg>
            {LandingHeroCopy.StartBuilding}
            <svg
              className="h-4 w-4 transition-transform group-hover:translate-x-0.5"
              viewBox="0 0 24 24"
              fill="none"
              aria-hidden
            >
              <path
                d="M5 12h14M13 6l6 6-6 6"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </Link>
        </div>

        <p className="mt-[18px] font-mono text-[10px] uppercase tracking-[0.26em] text-white/30">
          {LandingHeroCopy.Reassurance}
        </p>
      </div>
    </section>
  )
}
