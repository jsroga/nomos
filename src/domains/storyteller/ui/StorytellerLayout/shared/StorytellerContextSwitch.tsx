'use client'

import { BookOpen, Plus } from 'lucide-react'
import { HtmlElementType } from '@/shared/data/constants/protocol'
import { cn } from '@/shared/data/utils'
import {
  StorytellerHeaderClass,
  StorytellerHeaderCopy,
} from '../constants/storyteller-module-header'

function FilmStripIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7">
      <rect x="2.5" y="4" width="19" height="16" rx="2.5" />
      <path d="M7.5 4v16M16.5 4v16" />
    </svg>
  )
}

interface StorytellerContextSwitchProps {
  bibleSelected: boolean
  hasEpisode: boolean
  disabled?: boolean
  onSelectBible: () => void
  onSelectEpisode: () => void
  onCreateEpisode: () => void
}

export function StorytellerContextSwitch({
  bibleSelected,
  hasEpisode,
  disabled = false,
  onSelectBible,
  onSelectEpisode,
  onCreateEpisode,
}: StorytellerContextSwitchProps) {
  return (
    <div
      role="tablist"
      aria-label={StorytellerHeaderCopy.Storybible}
      className={cn(StorytellerHeaderClass.Switch, disabled && StorytellerHeaderClass.SwitchDisabled)}
    >
      <button
        type={HtmlElementType.Button}
        role="tab"
        aria-selected={bibleSelected}
        onClick={onSelectBible}
        className={cn(
          StorytellerHeaderClass.Segment,
          bibleSelected ? StorytellerHeaderClass.SegmentActive : StorytellerHeaderClass.SegmentIdle
        )}
      >
        <BookOpen size={13} strokeWidth={1.7} className={bibleSelected ? 'text-primary' : undefined} />
        {StorytellerHeaderCopy.Storybible}
      </button>
      {hasEpisode ? (
        <button
          type={HtmlElementType.Button}
          role="tab"
          aria-selected={!bibleSelected}
          onClick={onSelectEpisode}
          className={cn(
            StorytellerHeaderClass.Segment,
            !bibleSelected ? StorytellerHeaderClass.SegmentActive : StorytellerHeaderClass.SegmentIdle
          )}
        >
          <span className={!bibleSelected ? 'text-primary' : undefined}>
            <FilmStripIcon />
          </span>
          <span className={StorytellerHeaderClass.SegmentTitle}>
            {StorytellerHeaderCopy.Episodes}
          </span>
        </button>
      ) : (
        <button
          type={HtmlElementType.Button}
          role="tab"
          aria-selected={false}
          onClick={onCreateEpisode}
          className={cn(StorytellerHeaderClass.Segment, StorytellerHeaderClass.SegmentMuted)}
        >
          <Plus size={13} strokeWidth={1.8} />
          {StorytellerHeaderCopy.NewEpisode}
        </button>
      )}
    </div>
  )
}
