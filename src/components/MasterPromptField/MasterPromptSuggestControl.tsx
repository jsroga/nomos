'use client'

import { forwardRef, type ButtonHTMLAttributes } from 'react'
import { Sparkles } from 'lucide-react'
import { HtmlElementType } from '@/shared/data/constants/protocol'
import { cn } from '@/shared/data/utils'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/DropdownMenu'
import {
  MasterPromptFieldClass,
  MasterPromptFieldCopy,
  MasterPromptSuggestMode,
  type MasterPromptSuggestItem,
} from './constants/master-prompt-field'

interface MasterPromptSuggestControlProps {
  mode: MasterPromptSuggestMode
  items?: readonly MasterPromptSuggestItem[]
  onSuggest?: () => void
  onSuggestPick?: (id: string) => void
  busy?: boolean
  buttonId?: string
  label: string
}

type SuggestTriggerProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  busy: boolean
  buttonId?: string
  label: string
}

const SuggestTrigger = forwardRef<HTMLButtonElement, SuggestTriggerProps>(
  function SuggestTrigger({ busy, buttonId, label, className, disabled, type, ...props }, ref) {
    return (
      <button
        {...props}
        ref={ref}
        type={type ?? HtmlElementType.Button}
        id={buttonId}
        disabled={busy || disabled}
        title={MasterPromptFieldCopy.SuggestTitle}
        className={cn(
          busy ? MasterPromptFieldClass.SuggestBusy : MasterPromptFieldClass.Suggest,
          className,
        )}
      >
        {busy ? (
          <span className={MasterPromptFieldClass.SuggestSpinner} />
        ) : (
          <Sparkles size={11} strokeWidth={1.8} />
        )}
        {label}
      </button>
    )
  },
)

export function MasterPromptSuggestControl({
  mode,
  items = [],
  onSuggest,
  onSuggestPick,
  busy = false,
  buttonId,
  label,
}: MasterPromptSuggestControlProps) {
  if (mode === MasterPromptSuggestMode.Iterate) {
    return (
      <SuggestTrigger busy={busy} buttonId={buttonId} label={label} onClick={onSuggest} />
    )
  }

  return (
    <DropdownMenu modal={false}>
      <DropdownMenuTrigger asChild>
        <SuggestTrigger busy={busy} buttonId={buttonId} label={label} />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" side="bottom" className={MasterPromptFieldClass.IdeaMenu}>
        {items.map(item => (
          <DropdownMenuItem
            key={item.id}
            className={MasterPromptFieldClass.IdeaItem}
            onSelect={() => onSuggestPick?.(item.id)}
          >
            <span className={MasterPromptFieldClass.IdeaItemLabel}>{item.label}</span>
            {item.description ? (
              <span className={MasterPromptFieldClass.IdeaItemHint}>{item.description}</span>
            ) : null}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
