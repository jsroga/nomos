'use client'

import React, { useState } from 'react'
import { ChevronUp, ChevronDown, Trash2, Loader2, Edit2 } from 'lucide-react'
import { HtmlElementType } from '@/shared/data/constants/protocol'
import { useConfirmDialog } from '@/components/ConfirmDialog'
import { ConfirmDialogVariant } from '@/components/ConfirmDialog/constants/confirm-dialog-copy'
import {
  characterPortraitUrl,
  type StorytellerCharacter,
} from '@/domains/storyteller/core/entities/character-wire'
import {
  CharacterPanelConfirmCopy,
  CharacterPanelCopy,
  StorytellerConfirmCopy,
} from './constants/character-panel-metrics'
import { CharacterCardExpandedContent } from './CharacterCardExpandedContent'

interface CharacterCardProps {
  character: StorytellerCharacter
  onUpdate?: (characterId: string, updates: Partial<StorytellerCharacter>) => void
  onDelete?: (characterId: string) => void
  onEdit?: (character: StorytellerCharacter) => void
  isDeleting?: boolean
}

export const CharacterCard: React.FC<CharacterCardProps> = ({
  character,
  onDelete,
  onEdit,
  isDeleting,
}) => {
  const [isExpanded, setIsExpanded] = useState(false)
  const { confirm, ConfirmDialogComponent } = useConfirmDialog()

  const handleDelete = async () => {
    const confirmed = await confirm({
      title: CharacterPanelConfirmCopy.DeleteTitle,
      description: `Are you sure you want to delete ${character.name}? This action cannot be undone.`,
      confirmLabel: CharacterPanelConfirmCopy.DeleteLabel,
      cancelLabel: StorytellerConfirmCopy.CancelLabel,
      variant: ConfirmDialogVariant.Destructive,
    })
    if (confirmed && onDelete) {
      onDelete(character.id)
    }
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-[11px] px-3 py-[11px] border border-border/70 rounded-[10px] bg-card/35">
        <div
          className="flex items-center gap-[11px] min-w-0 flex-1 cursor-pointer"
          onClick={() => setIsExpanded(!isExpanded)}
        >
          {characterPortraitUrl(character) ? (
            <img
              src={characterPortraitUrl(character)}
              alt={character.name}
              className="w-[30px] h-[30px] rounded-full object-cover shadow-[inset_0_0_0_1px_hsl(var(--primary)/0.3)] shrink-0"
            />
          ) : (
            <div className="w-[30px] h-[30px] rounded-full bg-primary/16 shadow-[inset_0_0_0_1px_hsl(var(--primary)/0.3)] text-primary flex items-center justify-center font-mono text-xs shrink-0">
              {character.name?.[0] || CharacterPanelCopy.UnknownInitial}
            </div>
          )}
          <div className="min-w-0 flex-1">
            <div className="text-[13.5px] font-semibold text-foreground/95 truncate">{character.name}</div>
            <div className="font-mono text-[9.5px] tracking-[0.16em] uppercase text-muted-foreground/75 mt-[3px]">
              {character.role}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-[9px] text-muted-foreground/65 shrink-0">
          {onEdit && (
            <button
              type={HtmlElementType.Button}
              className="hover:text-foreground transition-all duration-150 ease-in-out"
              onClick={e => {
                e.stopPropagation()
                onEdit(character)
              }}
              aria-label={CharacterPanelCopy.Edit}
            >
              <Edit2 size={13} strokeWidth={1.7} />
            </button>
          )}
          {onDelete && (
            <button
              type={HtmlElementType.Button}
              className="hover:text-destructive transition-all duration-150 ease-in-out disabled:opacity-50"
              onClick={e => {
                e.stopPropagation()
                void handleDelete()
              }}
              disabled={isDeleting}
              aria-label={CharacterPanelConfirmCopy.DeleteLabel}
            >
              {isDeleting ? <Loader2 size={13} className="animate-spin" /> : <Trash2 size={13} strokeWidth={1.7} />}
            </button>
          )}
          <button
            type={HtmlElementType.Button}
            className="hover:text-foreground transition-all duration-150 ease-in-out"
            onClick={() => setIsExpanded(!isExpanded)}
            aria-label={CharacterPanelCopy.Toggle}
          >
            {isExpanded ? <ChevronUp size={13} strokeWidth={2} /> : <ChevronDown size={13} strokeWidth={2} />}
          </button>
        </div>
      </div>
      {isExpanded && <CharacterCardExpandedContent character={character} />}
      {ConfirmDialogComponent}
    </div>
  )
}
