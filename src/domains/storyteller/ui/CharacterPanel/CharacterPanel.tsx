import React, { useState, useEffect } from 'react'
import { CharacterCreationDialog } from '../CharacterCreationDialog'
import { Button } from '@/components/Button'
import { Plus, Users } from 'lucide-react'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/Tooltip'
import { fetchStorytellerTimeline } from '@/domains/storyteller/core/io/storyteller.api'
import { readString, recordFromJson, recordArrayFromJson, readNumber } from '@/shared/data/json-guards'
import { TOUR_STEP_IDS } from '@/shared/tours/tour-constants'
import {
  characterToDialogInitial,
  type StorytellerCharacter,
} from '@/domains/storyteller/core/entities/character-wire'
import type { CharacterMetrics } from '@/domains/storyteller/core/types/story-types'
import { CharacterDialogMode } from '@/domains/storyteller/ui/CharacterCreationDialog/constants/character-creation-dialog'
import {
  CHARACTER_PANEL_LOG_FETCH_FAILED,
  CharacterMetricKey,
  CharacterPanelCopy,
  formatCastHeading,
} from './constants/character-panel-metrics'
import { CharacterCard } from './CharacterCard'
import { CharacterPanelLoading } from './CharacterPanelLoading'
import { useStorytellerUiStore } from '@/domains/storyteller/state/useStorytellerUiStore'
import {
  isCharacterDraftPending,
  isCharacterSidebarGeneratingFields,
} from '../CharacterCreationDialog/character-creation-dialog-generate-missing'

interface CharacterPanelProps {
  characters: StorytellerCharacter[]
  onUpdate?: (characterId: string, updates: Partial<StorytellerCharacter>) => void
  onCreate?: (character: Partial<StorytellerCharacter>) => void
  onDelete?: (characterId: string) => void
  projectId?: string
  selectedBeatId?: string | null
  episodeId?: string | null
  isLoading?: boolean
}

const buildSnapshotMap = (
  snapshots: ReturnType<typeof recordArrayFromJson>
): Record<string, Partial<CharacterMetrics>> => {
  const snapshotMap: Record<string, Partial<CharacterMetrics>> = {}

  for (const snapRow of snapshots) {
    const snap = recordFromJson(snapRow)
    const getVal = (key: string, def: number) =>
      readNumber(snap[key]) ??
      readNumber(snap[key.replace(/[A-Z]/g, l => `_${l.toLowerCase()}`)]) ??
      def

    snapshotMap[readString(snap.characterId) ?? ''] = {
      valence: readNumber(snap.valence ?? snap.stress_level ?? snap.stressLevel) ?? 0,
      arousal: getVal(CharacterMetricKey.Arousal, 50),
      autonomy: getVal(CharacterMetricKey.Autonomy, 60),
      competence: getVal(CharacterMetricKey.Competence, 60),
      relatedness: getVal(CharacterMetricKey.Relatedness, 50),
      cognitiveClarity: getVal(CharacterMetricKey.CognitiveClarity, 70),
      perceivedStakes: getVal(CharacterMetricKey.PerceivedStakes, 40),
      socialSafety: getVal(CharacterMetricKey.SocialSafety, 60),
      moralAlignment: getVal(CharacterMetricKey.MoralAlignment, 70),
      transformation:
        readNumber(
          snap.transformationProgress ?? snap.transformation ?? snap.transformation_progress
        ) ?? 0,
    }
  }

  return snapshotMap
}

export const CharacterPanel: React.FC<CharacterPanelProps> = React.memo(({
  characters,
  onUpdate,
  onCreate,
  onDelete,
  projectId,
  selectedBeatId,
  episodeId,
  isLoading = false,
}) => {
  const [isCreationOpen, setIsCreationOpen] = useState(false)
  const [editingCharacter, setEditingCharacter] = useState<StorytellerCharacter | null>(null)
  const [snapshotCache, setSnapshotCache] = useState<
    Record<string, Record<string, Partial<CharacterMetrics>>>
  >({})
  const characterDraftTargetId = useStorytellerUiStore(state => state.characterDraftTargetId)
  const characterDraftFields = useStorytellerUiStore(state => state.characterDraftFields)
  const characterDraftFieldsSeq = useStorytellerUiStore(state => state.characterDraftFieldsSeq)
  const characterDraftResolvedSeq = useStorytellerUiStore(state => state.characterDraftResolvedSeq)
  const generationPhase = useStorytellerUiStore(state => state.generationActivity.phase)
  const isDraftPending = isCharacterDraftPending({
    fields: characterDraftFields,
    fieldsSeq: characterDraftFieldsSeq,
    resolvedSeq: characterDraftResolvedSeq,
  })

  const snapshotKey =
    selectedBeatId && episodeId ? `${episodeId}:${selectedBeatId}` : null
  const beatSnapshots = snapshotKey ? (snapshotCache[snapshotKey] ?? {}) : {}

  useEffect(() => {
    if (!snapshotKey) return

    let cancelled = false
    const [episode, beatId] = snapshotKey.split(':')

    fetchStorytellerTimeline(episode, beatId)
      .then(data => {
        if (cancelled) return
        const snapshots = recordArrayFromJson(data.snapshots)
        if (snapshots.length > 0) {
          setSnapshotCache(prev => ({
            ...prev,
            [snapshotKey]: buildSnapshotMap(snapshots),
          }))
        }
      })
      .catch(err => console.error(CHARACTER_PANEL_LOG_FETCH_FAILED, err))

    return () => {
      cancelled = true
    }
  }, [snapshotKey])

  const getCharacterWithSnapshot = (char: StorytellerCharacter): StorytellerCharacter => {
    const snapshot = beatSnapshots[char.id]
    if (!snapshot) return char
    return { ...char, ...snapshot }
  }

  if (isLoading) {
    return <CharacterPanelLoading />
  }

  return (
    <TooltipProvider>
      <div className="space-y-4">
        <div className="flex items-center justify-between mb-2.5" id={TOUR_STEP_IDS.STORYTELLER_CHARACTERS}>
          <h3 className="font-mono text-[10.5px] tracking-[0.16em] uppercase text-muted-foreground/80 flex items-center gap-2">
            <Users size={12} strokeWidth={1.7} />
            {formatCastHeading(characters.length)}
          </h3>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                size="sm"
                variant="outline"
                className="h-6 w-6 p-0 rounded-[7px] shadow-[inset_0_0_0_1px_hsl(var(--border)/0.8)] border-0 text-muted-foreground"
                onClick={() => setIsCreationOpen(true)}
              >
                <Plus size={14} />
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>{CharacterPanelCopy.Add}</p>
            </TooltipContent>
          </Tooltip>
        </div>

        <div className="flex flex-col gap-[7px]">
          {characters.map(char => (
            <CharacterCard
              key={char.id}
              character={getCharacterWithSnapshot(char)}
              onUpdate={onUpdate}
              onDelete={onDelete}
              onEdit={character => setEditingCharacter(character)}
              isGeneratingFields={isCharacterSidebarGeneratingFields({
                characterId: char.id,
                targetId: characterDraftTargetId,
                isPendingReview: isDraftPending,
                phase: generationPhase,
              })}
            />
          ))}
          {characters.length === 0 && (
            <div className="flex flex-col items-center gap-2.5 px-3 py-[26px] text-muted-foreground/70">
              <Users size={20} strokeWidth={1.5} />
              <span className="text-xs">{CharacterPanelCopy.Empty}</span>
            </div>
          )}
        </div>

        <CharacterCreationDialog
          isOpen={isCreationOpen}
          onClose={() => setIsCreationOpen(false)}
          onCreate={char => {
            if (onCreate) onCreate(char)
            setIsCreationOpen(false)
          }}
          projectId={projectId}
          mode={CharacterDialogMode.Create}
        />

        <CharacterCreationDialog
          isOpen={!!editingCharacter}
          onClose={() => setEditingCharacter(null)}
          onCreate={() => {}}
          onUpdate={async (id, updates) => {
            if (onUpdate) await onUpdate(id, updates)
          }}
          projectId={projectId}
          mode={CharacterDialogMode.Edit}
          initialData={
            editingCharacter
              ? characterToDialogInitial(
                  characters.find(c => c.id === editingCharacter.id) ?? editingCharacter,
                )
              : undefined
          }
        />
      </div>
    </TooltipProvider>
  )
})

CharacterPanel.displayName = 'CharacterPanel'
