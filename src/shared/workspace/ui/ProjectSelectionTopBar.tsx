'use client'

import Link from 'next/link'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/Avatar'
import {
  PROJECT_SELECTION_FOCUS_RING_VISIBLE,
  PROJECT_SELECTION_LOGO_ALT,
  PROJECT_SELECTION_LOGO_SRC,
  PROJECT_SELECTION_SIGN_OUT,
} from '../constants/project-selection'

type ProjectSelectionTopBarProps = {
  email: string | undefined
  avatarUrl: string | undefined
  onSignOut: () => void
}

/** Shared chrome with LandingNav + GlobalHeader (h-16, dark glass bar). */
export function ProjectSelectionTopBar({
  email,
  avatarUrl,
  onSignOut,
}: ProjectSelectionTopBarProps) {
  const initial = (email?.[0] ?? '?').toUpperCase()

  return (
    <header className="sticky top-0 z-50 h-16 shrink-0 border-b border-white/[0.06] bg-[rgba(9,9,11,0.92)]">
      <div className="mx-auto flex h-full max-w-[1280px] items-center justify-between gap-6 px-6">
        <Link href="/" prefetch={false} className="flex shrink-0 items-center">
          <img
            src={PROJECT_SELECTION_LOGO_SRC}
            alt={PROJECT_SELECTION_LOGO_ALT}
            width={132}
            height={23}
            className="h-auto w-[132px] object-contain"
          />
        </Link>

        <div className="flex items-center gap-5">
          <button
            type="button"
            onClick={onSignOut}
            className={`hidden text-[14px] font-medium text-white/[0.72] transition-colors duration-200 hover:text-white sm:inline ${PROJECT_SELECTION_FOCUS_RING_VISIBLE}`}
          >
            {PROJECT_SELECTION_SIGN_OUT}
          </button>

          <div className="inline-flex h-[34px] items-center gap-2.5 rounded-md border border-white/10 bg-white/[0.04] py-0 pl-1.5 pr-3">
            <Avatar className="h-7 w-7 border border-primary/30 bg-primary/20">
              <AvatarImage src={avatarUrl} alt="" />
              <AvatarFallback className="bg-transparent font-mono text-[10px] font-bold text-primary">
                {initial}
              </AvatarFallback>
            </Avatar>
            {email ? (
              <span className="max-w-[180px] truncate text-[13px] font-medium text-white/80">
                {email}
              </span>
            ) : null}
          </div>
        </div>
      </div>
    </header>
  )
}
