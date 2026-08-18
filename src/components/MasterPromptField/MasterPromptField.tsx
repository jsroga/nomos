'use client'

import { useState, type ReactNode } from 'react'
import { cn } from '@/shared/data/utils'
import {
  MasterPromptFieldClass,
  MasterPromptFieldCopy,
  MasterPromptSuggestMode,
  type MasterPromptSuggestItem,
} from './constants/master-prompt-field'
import { MasterPromptFieldBody } from './MasterPromptFieldBody'
import { MasterPromptSuggestControl } from './MasterPromptSuggestControl'

interface MasterPromptFieldProps {
  label: string
  icon?: ReactNode
  value: string
  onChange: (value: string) => void
  placeholder?: string
  suggestMode?: MasterPromptSuggestMode
  suggestItems?: readonly MasterPromptSuggestItem[]
  onSuggest?: () => void
  onSuggestPick?: (id: string) => void
  suggestBusy?: boolean
  suggestButtonId?: string
  suggestLabel?: string
  rightAction?: ReactNode
  suggestion?: ReactNode
  helper?: ReactNode
  onBlur?: () => void
  className?: string
  minRowsClassName?: string
  clamp?: boolean
}

export function MasterPromptField({
  label,
  icon,
  value,
  onChange,
  placeholder,
  suggestMode,
  suggestItems,
  onSuggest,
  onSuggestPick,
  suggestBusy = false,
  suggestButtonId,
  suggestLabel = MasterPromptFieldCopy.Suggest,
  rightAction,
  suggestion,
  helper,
  onBlur,
  className,
  minRowsClassName = MasterPromptFieldClass.MinRowsDefault,
  clamp = true,
}: MasterPromptFieldProps) {
  const [expanded, setExpanded] = useState(false)
  const showSuggest =
    Boolean(suggestMode) && (suggestMode !== MasterPromptSuggestMode.Iterate || !suggestion)

  return (
    <div className={cn(MasterPromptFieldClass.Root, className)}>
      <div className={MasterPromptFieldClass.LabelRow}>
        <span className={MasterPromptFieldClass.Label}>
          {icon}
          {label}
        </span>
        <div className={MasterPromptFieldClass.Actions}>
          {showSuggest && suggestMode ? (
            <MasterPromptSuggestControl
              mode={suggestMode}
              items={suggestItems}
              onSuggest={onSuggest}
              onSuggestPick={onSuggestPick}
              busy={suggestBusy}
              buttonId={suggestButtonId}
              label={suggestLabel}
            />
          ) : null}
          {rightAction}
        </div>
      </div>
      {suggestion ?? (
        <MasterPromptFieldBody
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          minRowsClassName={minRowsClassName}
          clamp={clamp}
          expanded={expanded}
          onToggleExpanded={() => setExpanded(open => !open)}
          loading={suggestBusy}
          onBlur={onBlur}
        />
      )}
      {helper}
    </div>
  )
}
