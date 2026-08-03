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

/** Same chrome geometry as marketing LandingNav (h-16, 1280 / px-6). */
export function ProjectSelectionTopBar({
  email,
  avatarUrl,
  onSignOut,
}: ProjectSelectionTopBarProps) {
  const initial = (email?.[0] ?? '?').toUpperCase()

  return (
    <header className="sticky top-0 z-40 h-16 border-b border-white/[0.06] bg-[rgba(9,9,11,0.92)]">
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
            className={`font-mono text-[11px] uppercase tracking-[0.2em] text-white/50 transition-colors duration-200 hover:text-white ${PROJECT_SELECTION_FOCUS_RING_VISIBLE}`}
          >
            {PROJECT_SELECTION_SIGN_OUT}
          </button>
          <div aria-hidden className="hidden h-5 w-px bg-white/10 sm:block" />
          <Avatar className="h-[30px] w-[30px] border border-primary/30 bg-primary/20">
            <AvatarImage src={avatarUrl} alt="" />
            <AvatarFallback className="bg-transparent font-mono text-[11px] font-bold text-primary">
              {initial}
            </AvatarFallback>
          </Avatar>
        </div>
      </div>
    </header>
  )
}
