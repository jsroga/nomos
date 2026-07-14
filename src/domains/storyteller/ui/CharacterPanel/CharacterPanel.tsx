import React, { useState, useEffect } from 'react'
import { CharacterCreationDialog } from '../CharacterCreationDialog'
import { Button } from '@/components/Button'
import {
  Plus,
  ChevronUp,
  ChevronDown,
  Trash2,
  Loader2,
  Users, // Relatedness / cast header
  Edit2,
} from 'lucide-react'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/Tooltip'
import { useConfirmDialog } from '@/components/ConfirmDialog'
import { readString, recordFromJson } from '@/shared/data/json-guards'
import { TOUR_STEP_IDS } from '@/shared/tours/tour-constants'
import {
  characterPortraitUrl,
  characterToDialogInitial,
  readCharacterMetric,
  type StorytellerCharacter,
} from '@/domains/storyteller/core/entities/character-wire'
import type { CharacterMetrics } from '@/domains/storyteller/core/types/StoryTypes'
import { CharacterDialogMode } from '@/domains/storyteller/ui/CharacterCreationDialog/constants/character-creation-dialog'
import {
  CHARACTER_METRIC_CONFIG,
  CHARACTER_PANEL_LOG_FETCH_FAILED,
  CharacterMetricKey,
  CharacterPanelConfirmCopy,
  StorytellerConfirmCopy,
  StorytellerConfirmVariant,
} from './constants/character-panel-metrics'

interface CharacterPanelProps {
  characters: StorytellerCharacter[]
  onUpdate?: (characterId: string, updates: Partial<StorytellerCharacter>) => void
  onCreate?: (character: Partial<StorytellerCharacter>) => void
  onDelete?: (characterId: string) => void
  projectId?: string
  // NEW: For beat-linked metrics
  selectedBeatId?: string | null
  episodeId?: string | null
  // NEW: Shimmer loading state
  isLoading?: boolean
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
  const [beatSnapshots, setBeatSnapshots] = useState<Record<string, Partial<CharacterMetrics>>>({})

  // Fetch character metric snapshots when selected beat changes
  useEffect(() => {
    if (selectedBeatId && episodeId) {
      fetch(`/api/storyteller/timeline?episodeId=${episodeId}&beatId=${selectedBeatId}`)
        .then(res => res.json())
        .then(data => {
          if (data.snapshots) {
            // Convert array to map by characterId
            const snapshotMap: Record<string, Partial<CharacterMetrics>> = {}
            for (const snap of data.snapshots) {
              const getVal = (key: string, def: number) =>
                snap[key] ?? snap[key.replace(/[A-Z]/g, l => `_${l.toLowerCase()}`)] ?? def
              snapshotMap[snap.characterId] = {
                valence: snap.valence ?? snap.stress_level ?? snap.stressLevel ?? 0,
                arousal: getVal(CharacterMetricKey.Arousal, 50),
                autonomy: getVal(CharacterMetricKey.Autonomy, 60),
                competence: getVal(CharacterMetricKey.Competence, 60),
                relatedness: getVal(CharacterMetricKey.Relatedness, 50),
                cognitiveClarity: getVal(CharacterMetricKey.CognitiveClarity, 70),
                perceivedStakes: getVal(CharacterMetricKey.PerceivedStakes, 40),
                socialSafety: getVal(CharacterMetricKey.SocialSafety, 60),
                moralAlignment: getVal(CharacterMetricKey.MoralAlignment, 70),
                transformation:
                  snap.transformationProgress ??
                  snap.transformation ??
                  snap.transformation_progress ??
                  0,
              }
            }
            setBeatSnapshots(snapshotMap)
          }
        })
        .catch(err => console.error(CHARACTER_PANEL_LOG_FETCH_FAILED, err))
    } else {
      // No beat selected - clear snapshots to show base character data
      setBeatSnapshots({})
    }
  }, [selectedBeatId, episodeId])

  // Merge base character with beat-specific snapshot
  const getCharacterWithSnapshot = (char: StorytellerCharacter): StorytellerCharacter => {
    const snapshot = beatSnapshots[char.id]
    if (!snapshot) return char
    return { ...char, ...snapshot }
  }

  // Shimmer loading state
  if (isLoading) {
    return (
      <div className="space-y-4 animate-pulse">
        <div className="flex items-center justify-between">
          <div className="h-4 bg-muted/40 rounded w-1/4"></div>
          <div className="h-6 w-6 bg-muted/40 rounded"></div>
        </div>
        <div className="space-y-3">
          {[1, 2, 3].map(i => (
            <div key={i} className="bg-black border border-white/5 rounded-lg p-3 h-20">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-8 h-8 rounded-full bg-muted/20"></div>
                <div className="flex-1 space-y-2">
                  <div className="h-3 bg-muted/20 rounded w-1/3"></div>
                  <div className="h-2 bg-muted/10 rounded w-1/4"></div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <TooltipProvider>
      <div className="space-y-4">
        <div className="flex items-center justify-between" id={TOUR_STEP_IDS.STORYTELLER_CHARACTERS}>
          <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
            <Users size={12} />
            Cast ({characters.length})
          </h3>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                size="sm"
                variant="outline"
                className="h-6 w-6 p-0"
                onClick={() => setIsCreationOpen(true)}
              >
                <Plus size={14} />
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>Add new character</p>
            </TooltipContent>
          </Tooltip>
        </div>

        <div className="space-y-3">
          {characters.map(char => (
            <CharacterCard
              key={char.id}
              character={getCharacterWithSnapshot(char)}
              onUpdate={onUpdate}
              onDelete={onDelete}
              onEdit={character => setEditingCharacter(character)}
            />
          ))}
          {characters.length === 0 && (
            <div className="text-center py-4 text-muted-foreground text-xs flex flex-col items-center gap-2">
              <Users size={20} className="opacity-30" />
              No characters yet. Click + to add one.
            </div>
          )}
        </div>

        {/* Create Dialog */}
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

        {/* Edit Dialog */}
        <CharacterCreationDialog
          isOpen={!!editingCharacter}
          onClose={() => setEditingCharacter(null)}
          onCreate={() => { }} // Not used in edit mode
          onUpdate={async (id, updates) => {
            if (onUpdate) await onUpdate(id, updates)
          }}
          projectId={projectId}
          mode={CharacterDialogMode.Edit}
          initialData={editingCharacter ? characterToDialogInitial(editingCharacter) : undefined}
        />
      </div>
    </TooltipProvider>
  )
})

CharacterPanel.displayName = 'CharacterPanel'

interface CharacterCardProps {
  character: StorytellerCharacter
  onUpdate?: (characterId: string, updates: Partial<StorytellerCharacter>) => void
  onDelete?: (characterId: string) => void
  onEdit?: (character: StorytellerCharacter) => void
  isDeleting?: boolean
}

const CharacterCard: React.FC<CharacterCardProps> = ({
  character,
  onDelete,
  onEdit,
  isDeleting,
}) => {
  const [isExpanded, setIsExpanded] = useState(false)
  const psychology = recordFromJson(character.psychology)
  const fatalFlaw = readString(psychology.fatalFlaw)
  const secrets = readString(psychology.secrets)
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
          {/* Actions visible on hover or always if preferred - keeping always for clarity */}
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

      {isExpanded && (
        <div className="space-y-3 pt-2 border-t border-border/50">
          {/* Description */}
          {character.description && (
            <div className="bg-background/50 p-2 rounded border border-border">
              <div className="text-[10px] text-muted-foreground uppercase mb-1">Description</div>
              <div className="text-xs text-foreground/80 leading-relaxed">
                {character.description}
              </div>
            </div>
          )}

          {/* Archetype & Psychology */}
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

          {/* Character Metrics Grid */}
          <div className="space-y-2">
            <div className="text-[10px] text-muted-foreground uppercase tracking-wider font-bold mb-2">
              Character Metrics
            </div>
            {CHARACTER_METRIC_CONFIG.map(metric => {
              const rawValue = readCharacterMetric(character, metric.key)

              // Handle valence (-100 to +100) vs standard (0-100)
              const isValenceMetric = metric.isValence
              const defaultValue = isValenceMetric ? 0 : 50
              const value = typeof rawValue === 'number' ? rawValue : defaultValue

              // Calculate display percentage (0-100% for progress bar)
              const displayPercentage = isValenceMetric
                ? (value + 100) / 2 // Map -100..+100 to 0..100
                : value

              // Display value (show actual value for clarity)
              const displayValue = isValenceMetric ? `${value > 0 ? '+' : ''}${value}` : `${value}%`
              // High risk conditions for new metrics
              const isHighRisk =
                (metric.key === CharacterMetricKey.Valence && value < -50) ||
                (metric.key === CharacterMetricKey.Autonomy && value < 25) ||
                (metric.key === CharacterMetricKey.SocialSafety && value < 25) ||
                (metric.key === CharacterMetricKey.PerceivedStakes && value > 85) ||
                (metric.key === CharacterMetricKey.MoralAlignment && value < 25)

              // Color gradient based on value
              const getBarColor = () => {
                if (isHighRisk) return undefined // Let className handle it
                if (isValenceMetric) {
                  // Gradient from red (negative) to green (positive)
                  const normalizedValue = (value + 100) / 200 // 0 to 1
                  const hue = Math.round(normalizedValue * 120) // 0 (red) to 120 (green)
                  return `hsl(${hue}, 70%, 50%)`
                }
                return `hsl(var(--primary) / ${0.4 + displayPercentage / 166})`
              }

              return (
                <div key={metric.key} className="space-y-0.5">
                  <div className="flex justify-between items-center text-xs">
                    <div className="flex items-center gap-1.5">
                      <metric.icon size={12} className={metric.color} />
                      <span className="text-muted-foreground">{metric.label}</span>
                    </div>
                    <span
                      className={
                        isHighRisk ? 'text-destructive font-bold' : 'text-muted-foreground'
                      }
                    >
                      {displayValue}
                    </span>
                  </div>
                  <div className="relative">
                    <div className="h-1 bg-secondary rounded-full overflow-hidden">
                      <div
                        className={`h-full transition-all duration-500 ${isHighRisk ? 'bg-destructive' : ''}`}
                        style={{
                          width: `${Math.max(0, Math.min(100, displayPercentage))}%`,
                          backgroundColor: getBarColor(),
                        }}
                      />
                    </div>
                    <div className="flex justify-between text-[9px] text-muted-foreground/50 mt-0.5">
                      <span>{metric.lowLabel}</span>
                      <span>{metric.highLabel}</span>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>

          {/* MBTI & Voice */}
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="bg-background/50 p-2 rounded border border-border">
              <div className="text-[10px] text-muted-foreground uppercase mb-1">MBTI</div>
              <div className="font-mono">{character.mbti || '????'}</div>
            </div>
            <div className="bg-background/50 p-2 rounded border border-border">
              <div className="text-[10px] text-muted-foreground uppercase mb-1">Voice</div>
              <div className="truncate" title={character.voiceSignature}>
                {character.voiceSignature || 'Undefined'}
              </div>
            </div>
          </div>

          {/* Gender & Prompt */}
          <div className="space-y-2 text-xs">
            <div className="bg-background/50 p-2 rounded border border-border">
              <div className="text-[10px] text-muted-foreground uppercase mb-1">Gender</div>
              <div>{character.gender || 'Not specified'}</div>
            </div>
            <div className="bg-background/50 p-2 rounded border border-border">
              <div className="text-[10px] text-muted-foreground uppercase mb-1">
                Character Prompt
              </div>
              <div className="line-clamp-3 italic text-muted-foreground">
                {character.characterPrompt || 'No prompt set.'}
              </div>
            </div>
          </div>
        </div>
      )}
      {ConfirmDialogComponent}
    </div>
  )
}
