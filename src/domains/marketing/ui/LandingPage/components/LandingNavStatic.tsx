import Link from 'next/link'
import {
  LANDING_NAV_ITEMS,
  LandingExternalUrl,
  LandingHeroCopy,
  LandingNavItem,
  LandingSectionId,
} from '@/domains/marketing/ui/LandingPage/constants/landing-copy'
import { LandingNavUiCopy } from '@/domains/marketing/ui/LandingPage/constants/landing-ui-copy'

function navHref(item: LandingNavItem): string {
  if (item === LandingNavItem.Docs) return LandingExternalUrl.DocsReadme
  if (item === LandingNavItem.Api) return LandingExternalUrl.ApiDocs
  return `#${LandingSectionId.Systems}`
}

/** Static top bar in the first HTML — no client JS. */
export function LandingNavStatic() {
  return (
    <nav className="fixed top-0 left-0 right-0 z-50 h-16 border-b border-white/[0.06] bg-[rgba(9,9,11,0.92)]">
      <div className="mx-auto flex h-full max-w-[1280px] items-center justify-between gap-6 px-6">
        <div className="flex min-w-0 items-center gap-[30px]">
          <Link href="/" prefetch={false} className="flex shrink-0 items-center">
            <img
              src="/logo.png"
              alt={LandingNavUiCopy.LogoAlt}
              className="h-auto w-[132px] object-contain"
              width={132}
              height={23}
            />
          </Link>
          <div className="hidden items-center gap-[30px] md:flex">
            {LANDING_NAV_ITEMS.map(item => (
              <a
                key={item}
                href={navHref(item)}
                className="font-mono text-[11px] uppercase tracking-[0.2em] text-white/50 transition-colors duration-200 hover:text-white"
                {...(item === LandingNavItem.Docs
                  ? { target: '_blank', rel: 'noopener noreferrer' }
                  : {})}
              >
                {item}
              </a>
            ))}
          </div>
        </div>
        <div className="flex items-center gap-5">
          <Link
            prefetch={false}
            href={LandingExternalUrl.Login}
            className="hidden text-[14px] font-medium text-white/[0.72] transition-colors duration-200 hover:text-white sm:inline"
          >
            {LandingHeroCopy.SignIn}
          </Link>
          <Link
            prefetch={false}
            href={LandingExternalUrl.Login}
            className="inline-flex h-[34px] items-center rounded-md bg-primary px-3.5 text-[13px] font-medium text-primary-foreground transition-colors duration-200 hover:bg-primary/90"
          >
            {LandingHeroCopy.GetStarted}
          </Link>
        </div>
      </div>
    </nav>
  )
}
