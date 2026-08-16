import React from 'react'
import { readString, recordFromJson } from '@/shared/data/json-guards'
import type { StorytellerCharacter } from '@/domains/storyteller/core/entities/character-wire'
import { CharacterMetricGrid } from './CharacterMetricGrid'
import { characterDisplayValue } from './character-display-value'

interface CharacterCardExpandedContentProps {
  character: StorytellerCharacter
}

export const CharacterCardExpandedContent: React.FC<CharacterCardExpandedContentProps> = ({
  character,
}) => {
  const psychology = recordFromJson(character.psychology)
  const fatalFlaw = readString(psychology.fatalFlaw)
  const secrets = readString(psychology.secrets)

  return (
    <div className="space-y-3 pt-2 border-t border-border/50">
      {character.description && (
        <div className="bg-background/50 p-2 rounded border border-border">
          <div className="text-[10px] text-muted-foreground uppercase mb-1">Description</div>
          <div className="text-xs text-foreground/80 leading-relaxed">{character.description}</div>
        </div>
      )}

      {(character.archetype || character.psychology) && (
        <div className="space-y-2">
          {character.archetype && (
            <div className="bg-background/50 p-2 rounded border border-border">
              <div className="text-[10px] text-muted-foreground uppercase mb-1">Archetype</div>
              <div className="text-xs font-medium">{character.archetype}</div>
            </div>
          )}
          {fatalFlaw && (
            <div className="bg-background/50 p-2 rounded border border-destructive/20">
              <div className="text-[10px] text-destructive/70 uppercase mb-1">Fatal Flaw</div>
              <div className="text-xs text-foreground/80">{fatalFlaw}</div>
            </div>
          )}
          {secrets && (
            <div className="bg-background/50 p-2 rounded border border-amber-500/20">
              <div className="text-[10px] text-amber-500/70 uppercase mb-1">Secret</div>
              <div className="text-xs text-foreground/80 italic">{secrets}</div>
            </div>
          )}
        </div>
      )}

      <CharacterMetricGrid character={character} />

      <div className="grid grid-cols-2 gap-2 text-xs">
        <div className="bg-background/50 p-2 rounded border border-border">
          <div className="text-[10px] text-muted-foreground uppercase mb-1">MBTI</div>
          <div className="font-mono">{characterDisplayValue(character.mbti)}</div>
        </div>
        <div className="bg-background/50 p-2 rounded border border-border">
          <div className="text-[10px] text-muted-foreground uppercase mb-1">Voice</div>
          <div className="truncate" title={characterDisplayValue(character.voiceSignature)}>
            {characterDisplayValue(character.voiceSignature)}
          </div>
        </div>
      </div>

      <div className="space-y-2 text-xs">
        <div className="bg-background/50 p-2 rounded border border-border">
          <div className="text-[10px] text-muted-foreground uppercase mb-1">Gender</div>
          <div>{character.gender || 'Not specified'}</div>
        </div>
        <div className="bg-background/50 p-2 rounded border border-border">
          <div className="text-[10px] text-muted-foreground uppercase mb-1">Character Prompt</div>
          <div className="line-clamp-3 italic text-muted-foreground">
            {character.characterPrompt || 'No prompt set.'}
          </div>
        </div>
      </div>
    </div>
  )
}
