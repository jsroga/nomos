import Link from 'next/link'
import {
  LandingExternalUrl,
  LandingHeroCopy,
} from '@/domains/marketing/ui/LandingPage/constants/landing-copy'
import { LandingNavUiCopy } from '@/domains/marketing/ui/LandingPage/constants/landing-ui-copy'

/** Static top bar in the first HTML — no client JS. */
export function LandingNavStatic() {
  return (
    <nav className="fixed top-0 left-0 right-0 z-50 border-b border-white/5 bg-black/70">
      <div className="mx-auto max-w-7xl px-6">
        <div className="flex h-16 items-center justify-between gap-4 w-full">
          <Link href="/" prefetch={false} className="flex items-center">
            <img
              src="/logo.svg"
              alt={LandingNavUiCopy.LogoAlt}
              className="w-28 h-auto object-contain brightness-0 invert"
              width={112}
              height={40}
            />
          </Link>
          <Link
            prefetch={false}
            href={LandingExternalUrl.Login}
            className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-bold text-white rounded-lg border border-primary/50 bg-primary/10 font-syne tracking-wide"
          >
            {LandingHeroCopy.GetStarted}
          </Link>
        </div>
      </div>
    </nav>
  )
}
