'use client'

import { ArrowRight, Github, Menu, X } from 'lucide-react'
import Link from 'next/link'
import {
  LANDING_NAV_ITEMS,
  LandingExternalUrl,
  LandingHeroCopy,
} from '@/domains/marketing/ui/LandingPage/constants/landing-copy'
import { LandingNavUiCopy } from '@/domains/marketing/ui/LandingPage/constants/landing-ui-copy'
import { handleLandingNavSelect } from '@/domains/marketing/ui/LandingPage/constants/landing-nav'

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
      <nav className="fixed top-0 left-0 right-0 z-50 border-b border-white/5 bg-black/70">
        <div className="mx-auto max-w-7xl px-6">
          <div className="grid grid-cols-3 h-16 items-center gap-4 w-full">
            <div className="flex items-center justify-start min-w-0">
              <Link href="/" prefetch={false} className="flex items-center group">
                <div className="relative w-28 h-auto flex items-center justify-center group-hover:bg-primary/10 transition-colors rounded-lg p-1">
                  <img
                    src="/logo.svg"
                    alt={LandingNavUiCopy.LogoAlt}
                    className="w-full h-full object-contain brightness-0 invert"
                    width={112}
                    height={40}
                  />
                </div>
              </Link>
            </div>

            <div className="hidden md:flex items-center justify-center gap-1 min-w-0">
              {LANDING_NAV_ITEMS.map(item => (
                <button
                  key={item}
                  type="button"
                  className="px-4 py-2 text-xs font-mono uppercase tracking-widest text-white/50 hover:text-white transition-colors"
                  onClick={() => handleLandingNavSelect(item)}
                >
                  {item}
                </button>
              ))}
            </div>

            <div className="flex items-center justify-end gap-4 min-w-0">
              <a
                href={LandingExternalUrl.GitHubRepo}
                target="_blank"
                rel="noopener noreferrer"
                className="hidden sm:inline-flex items-center gap-2 px-3 py-2 text-sm text-white/70 hover:text-white transition-colors rounded-lg border border-white/10 hover:border-white/30 hover:bg-white/5"
                aria-label="View on GitHub"
              >
                <Github className="w-4 h-4" />
                <span>{LandingNavUiCopy.GitHub}</span>
              </a>

              <button
                type="button"
                onClick={onMobileMenuOpen}
                className="md:hidden p-2 rounded-lg border border-white/10 hover:border-primary/50 hover:bg-primary/10 transition-colors"
              >
                <Menu className="w-5 h-5 text-white" />
              </button>

              <Link
                prefetch={false}
                href={isLoggedIn ? LandingExternalUrl.Projects : LandingExternalUrl.Login}
                className="hidden sm:inline-flex group relative items-center gap-2 px-5 py-2.5 text-sm font-bold text-white transition-colors duration-200 rounded-lg border border-primary/50 hover:border-primary bg-primary/10 hover:bg-primary/20"
              >
                <span>
                  {isLoggedIn ? LandingHeroCopy.Dashboard : LandingHeroCopy.GetStarted}
                </span>
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </Link>
            </div>
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
          <div className="fixed top-0 right-0 bottom-0 z-[70] w-72 bg-[#0a0a0a] border-l border-white/10 md:hidden">
            <div className="flex flex-col h-full">
              <div className="flex items-center justify-between p-6 border-b border-white/5">
                <span className="text-xs font-mono text-primary tracking-widest uppercase">
                  {LandingNavUiCopy.Menu}
                </span>
                <button
                  type="button"
                  onClick={onMobileMenuClose}
                  className="p-2 rounded-lg hover:bg-white/5 transition-colors"
                >
                  <X className="w-5 h-5 text-white/60" />
                </button>
              </div>

              <div className="p-6 border-b border-white/5 space-y-3">
                <Link
                  prefetch={false}
                  href={isLoggedIn ? LandingExternalUrl.Projects : LandingExternalUrl.Login}
                  onClick={onMobileMenuClose}
                  className="flex items-center justify-center gap-2 w-full px-5 py-3 text-sm font-bold text-white rounded-lg border border-primary/50 bg-primary/20 hover:bg-primary/30 transition-colors font-syne tracking-wide"
                >
                  {isLoggedIn ? LandingHeroCopy.Dashboard : LandingHeroCopy.GetStarted}
                  <ArrowRight className="w-4 h-4" />
                </Link>
                <a
                  href={LandingExternalUrl.GitHubRepo}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={onMobileMenuClose}
                  className="flex items-center justify-center gap-2 w-full px-5 py-3 text-sm text-white/70 rounded-lg border border-white/10 hover:border-white/30 hover:bg-white/5 transition-colors"
                >
                  <Github className="w-4 h-4" />
                  {LandingNavUiCopy.GitHub}
                </a>
              </div>

              <div className="flex-1 p-6 space-y-2">
                {LANDING_NAV_ITEMS.map(item => (
                  <button
                    key={item}
                    type="button"
                    onClick={() => {
                      onMobileMenuClose()
                      handleLandingNavSelect(item)
                    }}
                    className="w-full text-left px-4 py-3 rounded-lg text-white/70 hover:text-white hover:bg-primary/10 transition-colors font-mono text-sm tracking-wider"
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
