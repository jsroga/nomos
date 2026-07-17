'use client'

import React, { useState } from 'react'
import { Button } from '@/components/Button'
import { ChevronUp, ChevronDown, Trash2, Loader2, Edit2 } from 'lucide-react'
import { useConfirmDialog } from '@/components/ConfirmDialog'
import {
  characterPortraitUrl,
  type StorytellerCharacter,
} from '@/domains/storyteller/core/entities/character-wire'
import {
  CharacterPanelConfirmCopy,
  StorytellerConfirmCopy,
  StorytellerConfirmVariant,
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
      variant: StorytellerConfirmVariant.Destructive,
    })
    if (confirmed && onDelete) {
      onDelete(character.id)
    }
  }

  return (
    <div className="bg-black border border-border rounded-lg p-3 space-y-3">
      <div
        className="flex items-center justify-between cursor-pointer"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center gap-2">
          {characterPortraitUrl(character) ? (
            <img
              src={characterPortraitUrl(character)}
              alt={character.name}
              className="w-8 h-8 rounded-full object-cover border border-primary/30 shrink-0"
            />
          ) : (
            <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-xs font-bold text-primary border border-primary/30 shrink-0">
              {character.name?.[0] || '?'}
            </div>
          )}
          <div className="min-w-0 flex-1">
            <div className="font-bold text-sm leading-none truncate">{character.name}</div>
            <div className="text-[10px] text-muted-foreground uppercase tracking-wider leading-tight break-words mt-0.5">
              {character.role}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-1">
          {onEdit && (
            <Button
              size="sm"
              variant="ghost"
              className="h-6 w-6 p-0 hover:bg-muted text-muted-foreground hover:text-foreground"
              onClick={e => {
                e.stopPropagation()
                onEdit(character)
              }}
            >
              <Edit2 size={12} />
            </Button>
          )}
          {onDelete && (
            <Button
              size="sm"
              variant="ghost"
              className="h-6 w-6 p-0 hover:bg-destructive/10 text-muted-foreground hover:text-destructive"
              onClick={e => {
                e.stopPropagation()
                handleDelete()
              }}
              disabled={isDeleting}
            >
              {isDeleting ? <Loader2 size={12} className="animate-spin" /> : <Trash2 size={12} />}
            </Button>
          )}
          {isExpanded ? (
            <ChevronUp size={14} className="text-muted-foreground ml-1" />
          ) : (
            <ChevronDown size={14} className="text-muted-foreground ml-1" />
          )}
        </div>
      </div>

      {isExpanded && <CharacterCardExpandedContent character={character} />}
      {ConfirmDialogComponent}
    </div>
  )
}
