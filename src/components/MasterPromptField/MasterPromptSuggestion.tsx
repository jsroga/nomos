'use client'

import { Sparkles } from 'lucide-react'
import { HtmlElementType } from '@/shared/data/constants/protocol'
import {
  MasterPromptFieldClass,
  MasterPromptFieldCopy,
} from './constants/master-prompt-field'

interface MasterPromptSuggestionProps {
  idea: string
  onAccept: () => void
  onReject: () => void
  onNext: () => void
}

export function MasterPromptSuggestion({
  idea,
  onAccept,
  onReject,
  onNext,
}: MasterPromptSuggestionProps) {
  return (
    <div className={MasterPromptFieldClass.Suggestion}>
      <div className={MasterPromptFieldClass.SuggestionLabel}>
        <Sparkles size={12} strokeWidth={1.8} />
        {MasterPromptFieldCopy.Suggested}
      </div>
      <p className={MasterPromptFieldClass.SuggestionText}>{idea}</p>
      <div className="flex gap-2 pt-1">
        <button type={HtmlElementType.Button} className={MasterPromptFieldClass.PrimaryAction} onClick={onAccept}>
          {MasterPromptFieldCopy.Accept}
        </button>
        <button type={HtmlElementType.Button} className={MasterPromptFieldClass.GhostAction} onClick={onReject}>
          {MasterPromptFieldCopy.Reject}
        </button>
        <div className="flex-1" />
        <button
          type={HtmlElementType.Button}
          className={MasterPromptFieldClass.Suggest}
          onClick={onNext}
          title={MasterPromptFieldCopy.NextTitle}
        >
          {MasterPromptFieldCopy.Next}
          <Sparkles size={10} strokeWidth={1.8} />
        </button>
      </div>
    </div>
  )
}
