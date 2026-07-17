'use client'

import { cn } from '@/shared/data/utils'
import { TOUR_STEP_IDS } from '@/shared/tours/tour-constants'
import { Lock, BookOpen } from 'lucide-react'
import { Button } from '@/components/Button'
import {
  StorybibleToggleClass,
  StorybibleToggleLabel,
  StorybibleToggleTitle,
} from '@/domains/storyteller/ui/StorytellerLayout/constants/storybible-toggle'

interface StorybibleToggleButtonProps {
  isWorldBibleOpen: boolean
  isBibleLocked: boolean
  bibleLockedBy: string | null | undefined
  isSending: boolean
  onToggle: () => void
}

function storybibleTitle(
  isSending: boolean,
  isBibleLocked: boolean,
  bibleLockedBy: string | null | undefined,
  isWorldBibleOpen: boolean,
): string {
  if (isSending) return StorybibleToggleTitle.UnavailableWhileWorking
  if (isBibleLocked) {
    const action = isWorldBibleOpen ? StorybibleToggleLabel.Close : StorybibleToggleLabel.Open
    return `${StorybibleToggleTitle.LockedReadOnly} ${bibleLockedBy || StorybibleToggleTitle.LockedByFallback} - ${action} ${StorybibleToggleTitle.ReadOnlySuffix}`
  }
  return isWorldBibleOpen ? StorybibleToggleLabel.Close : StorybibleToggleLabel.Open
}

function storybibleButtonClass(
  isWorldBibleOpen: boolean,
  isBibleLocked: boolean,
  isSending: boolean,
): string {
  if (isWorldBibleOpen) {
    if (isBibleLocked) return cn(StorybibleToggleClass.Base, StorybibleToggleClass.OpenLocked)
    return cn(StorybibleToggleClass.Base, StorybibleToggleClass.OpenUnlocked)
  }

  if (isBibleLocked) {
    return cn(StorybibleToggleClass.Base, StorybibleToggleClass.ClosedLocked)
  }

  return cn(
    StorybibleToggleClass.Base,
    StorybibleToggleClass.ClosedDefault,
    isSending && StorybibleToggleClass.Disabled,
  )
}

export function StorybibleToggleButton({
  isWorldBibleOpen,
  isBibleLocked,
  bibleLockedBy,
  isSending,
  onToggle,
}: StorybibleToggleButtonProps) {
  return (
    <Button
      variant={isWorldBibleOpen ? 'default' : 'outline'}
      size="sm"
      onClick={onToggle}
      disabled={isSending}
      className={storybibleButtonClass(isWorldBibleOpen, isBibleLocked, isSending)}
      title={storybibleTitle(isSending, isBibleLocked, bibleLockedBy, isWorldBibleOpen)}
      id={TOUR_STEP_IDS.STORYTELLER_BIBLE}
    >
      {isBibleLocked ? <Lock className="w-3.5 h-3.5" /> : <BookOpen className="w-3.5 h-3.5" />}
      <span>
        {isWorldBibleOpen ? StorybibleToggleLabel.OpenStateBadge : StorybibleToggleLabel.OpenBadge}
      </span>
    </Button>
  )
}
