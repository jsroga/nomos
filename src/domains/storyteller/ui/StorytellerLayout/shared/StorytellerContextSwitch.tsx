'use client'

import { BookOpen, Plus } from 'lucide-react'
import {
  StorytellerHeaderClass,
  StorytellerHeaderCopy,
} from '../constants/storyteller-module-header'
import { StorytellerHeaderSwitch } from './StorytellerHeaderSwitch'

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
    <StorytellerHeaderSwitch
      label={StorytellerHeaderCopy.Storybible}
      disabled={disabled}
      items={[
        {
          id: StorytellerHeaderCopy.Storybible,
          label: StorytellerHeaderCopy.Storybible,
          icon: <BookOpen size={13} strokeWidth={1.7} />,
          selected: bibleSelected,
          onSelect: onSelectBible,
        },
        hasEpisode
          ? {
              id: StorytellerHeaderCopy.Episodes,
              label: StorytellerHeaderCopy.Episodes,
              icon: <FilmStripIcon />,
              selected: !bibleSelected,
              titleClassName: StorytellerHeaderClass.SegmentTitle,
              onSelect: onSelectEpisode,
            }
          : {
              id: StorytellerHeaderCopy.NewEpisode,
              label: StorytellerHeaderCopy.NewEpisode,
              icon: <Plus size={13} strokeWidth={1.8} />,
              selected: false,
              muted: true,
              onSelect: onCreateEpisode,
            },
      ]}
    />
  )
}
