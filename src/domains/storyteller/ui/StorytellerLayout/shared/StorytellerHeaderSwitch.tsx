'use client'

import type { ReactNode } from 'react'
import { HtmlElementType } from '@/shared/data/constants/protocol'
import { cn } from '@/shared/data/utils'
import { StorytellerHeaderClass } from '../constants/storyteller-module-header'

export interface StorytellerHeaderSwitchItem {
  id: string
  label: string
  icon: ReactNode
  selected: boolean
  muted?: boolean
  titleClassName?: string
  onSelect: () => void
}

interface StorytellerHeaderSwitchProps {
  label: string
  items: readonly StorytellerHeaderSwitchItem[]
  disabled?: boolean
  className?: string
}

export function StorytellerHeaderSwitch({
  label,
  items,
  disabled = false,
  className,
}: StorytellerHeaderSwitchProps) {
  return (
    <div
      role="tablist"
      aria-label={label}
      className={cn(
        StorytellerHeaderClass.Switch,
        disabled && StorytellerHeaderClass.SwitchDisabled,
        className,
      )}
    >
      {items.map(item => (
        <button
          key={item.id}
          type={HtmlElementType.Button}
          role="tab"
          aria-selected={item.selected}
          onClick={item.onSelect}
          className={cn(
            StorytellerHeaderClass.Segment,
            item.muted
              ? StorytellerHeaderClass.SegmentMuted
              : item.selected
                ? StorytellerHeaderClass.SegmentActive
                : StorytellerHeaderClass.SegmentIdle,
          )}
        >
          <span className={item.selected ? 'text-primary' : undefined}>{item.icon}</span>
          {item.titleClassName ? (
            <span className={item.titleClassName}>{item.label}</span>
          ) : (
            item.label
          )}
        </button>
      ))}
    </div>
  )
}
