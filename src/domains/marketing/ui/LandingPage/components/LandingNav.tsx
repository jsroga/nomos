'use client'

import { ArrowRight, Menu, X } from 'lucide-react'
import Link from 'next/link'
import {
  LANDING_NAV_ITEMS,
  LandingExternalUrl,
  LandingHeroCopy,
} from '@/domains/marketing/ui/LandingPage/constants/landing-copy'
import { LandingNavUiCopy } from '@/domains/marketing/ui/LandingPage/constants/landing-ui-copy'
import { handleLandingNavSelect } from '@/domains/marketing/ui/LandingPage/constants/landing-nav'
import { LandingGitHubLink } from './LandingGitHubLink'

type LandingNavProps = {
  isLoggedIn: boolean
  mobileMenuOpen: boolean
  onMobileMenuOpen: () => void
  onMobileMenuClose: () => void
}

export function LandingNav({
  isLoggedIn,
  mobileMenuOpen,
  onMobileMenuOpen,
  onMobileMenuClose,
}: LandingNavProps) {
  return (
    <>
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
                <button
                  key={item}
                  type="button"
                  className="font-mono text-[11px] uppercase tracking-[0.2em] text-white/50 transition-colors duration-200 hover:text-white"
                  onClick={() => handleLandingNavSelect(item)}
                >
                  {item}
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-5">
            <button
              type="button"
              onClick={onMobileMenuOpen}
              className="rounded-lg border border-white/10 p-2 transition-colors hover:border-primary/50 hover:bg-primary/10 md:hidden"
            >
              <Menu className="h-5 w-5 text-white" />
            </button>

            <LandingGitHubLink className="flex items-center text-white/50 transition-colors duration-200 hover:text-white" />

            {!isLoggedIn ? (
              <Link
                prefetch={false}
                href={LandingExternalUrl.Login}
                className="hidden text-[14px] font-medium text-white/[0.72] transition-colors duration-200 hover:text-white sm:inline"
              >
                {LandingHeroCopy.SignIn}
              </Link>
            ) : null}

            <Link
              prefetch={false}
              href={isLoggedIn ? LandingExternalUrl.Projects : LandingExternalUrl.Login}
              className="hidden h-[34px] items-center rounded-md bg-primary px-3.5 text-[13px] font-medium text-primary-foreground transition-colors duration-200 hover:bg-primary/90 sm:inline-flex"
            >
              {isLoggedIn ? LandingHeroCopy.Dashboard : LandingHeroCopy.GetStarted}
            </Link>
          </div>
        </div>
      </nav>

      {mobileMenuOpen ? (
        <>
          <button
            type="button"
            aria-label={LandingNavUiCopy.Menu}
            onClick={onMobileMenuClose}
            className="fixed inset-0 z-[60] bg-black/80 md:hidden"
          />
          <div className="fixed top-0 right-0 bottom-0 z-[70] w-72 border-l border-white/10 bg-[#0a0a0a] md:hidden">
            <div className="flex h-full flex-col">
              <div className="flex items-center justify-between border-b border-white/[0.06] p-6">
                <span className="font-mono text-xs uppercase tracking-widest text-primary">
                  {LandingNavUiCopy.Menu}
                </span>
                <button
                  type="button"
                  onClick={onMobileMenuClose}
                  className="rounded-lg p-2 transition-colors hover:bg-white/5"
                >
                  <X className="h-5 w-5 text-white/60" />
                </button>
              </div>

              <div className="space-y-3 border-b border-white/[0.06] p-6">
                <LandingGitHubLink
                  showLabel
                  onClick={onMobileMenuClose}
                  className="flex w-full items-center justify-center gap-2 py-2 font-mono text-sm tracking-wider text-white/70 transition-colors hover:text-white"
                />
                {!isLoggedIn ? (
                  <Link
                    prefetch={false}
                    href={LandingExternalUrl.Login}
                    onClick={onMobileMenuClose}
                    className="block w-full py-2 text-center text-[14px] font-medium text-white/[0.72]"
                  >
                    {LandingHeroCopy.SignIn}
                  </Link>
                ) : null}
                <Link
                  prefetch={false}
                  href={isLoggedIn ? LandingExternalUrl.Projects : LandingExternalUrl.Login}
                  onClick={onMobileMenuClose}
                  className="flex h-[34px] w-full items-center justify-center rounded-md bg-primary text-[13px] font-medium text-primary-foreground transition-colors hover:bg-primary/90"
                >
                  {isLoggedIn ? LandingHeroCopy.Dashboard : LandingHeroCopy.GetStarted}
                  <ArrowRight className="ml-2 h-3.5 w-3.5 opacity-80" />
                </Link>
              </div>

              <div className="flex-1 space-y-2 p-6">
                {LANDING_NAV_ITEMS.map(item => (
                  <button
                    key={item}
                    type="button"
                    onClick={() => {
                      onMobileMenuClose()
                      handleLandingNavSelect(item)
                    }}
                    className="w-full rounded-lg px-4 py-3 text-left font-mono text-sm tracking-wider text-white/70 transition-colors hover:bg-primary/10 hover:text-white"
                  >
                    {item}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </>
      ) : null}
    </>
  )
}
