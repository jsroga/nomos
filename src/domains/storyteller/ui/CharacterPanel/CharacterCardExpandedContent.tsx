import React from 'react'
import { readString, recordFromJson } from '@/shared/data/json-guards'
import type { StorytellerCharacter } from '@/domains/storyteller/core/entities/character-wire'
import { characterDisplayValue } from './character-display-value'
import {
  CharacterExpandFieldLabel,
  CharacterPsychologyField,
} from './constants/character-panel-metrics'

interface CharacterCardExpandedContentProps {
  character: StorytellerCharacter
}

interface ExpandedFieldProps {
  label: CharacterExpandFieldLabel
  value: string | undefined
  className?: string
}

function ExpandedField({ label, value, className }: ExpandedFieldProps) {
  return (
    <div className="bg-background/50 p-2 rounded border border-border">
      <div className="text-[10px] text-muted-foreground uppercase mb-1">{label}</div>
      <div className={className ?? 'text-xs text-foreground/80 leading-relaxed'}>
        {characterDisplayValue(value)}
      </div>
    </div>
  )
}

export const CharacterCardExpandedContent: React.FC<CharacterCardExpandedContentProps> = ({
  character,
}) => {
  const psychology = recordFromJson(character.psychology)
  const motivation = readString(psychology[CharacterPsychologyField.ActualMotivation])

  return (
    <div className="space-y-3 pt-2 border-t border-border/50">
      <ExpandedField
        label={CharacterExpandFieldLabel.Description}
        value={character.description}
      />
      <div className="grid grid-cols-2 gap-2 text-xs">
        <ExpandedField label={CharacterExpandFieldLabel.Role} value={character.role} />
        <ExpandedField label={CharacterExpandFieldLabel.Gender} value={character.gender} />
        <ExpandedField
          label={CharacterExpandFieldLabel.Mbti}
          value={character.mbti}
          className="font-mono text-xs"
        />
      </div>
      <ExpandedField label={CharacterExpandFieldLabel.Motivation} value={motivation} />
    </div>
  )
}
