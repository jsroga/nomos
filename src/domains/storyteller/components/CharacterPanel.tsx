import React, { useState, useEffect } from 'react'
import { CharacterCreationDialog } from './CharacterCreationDialog'
import { Button } from '@/components/ui/button'
import {
  Plus,
  ChevronUp,
  ChevronDown,
  Trash2,
  Heart, // Valence
  Zap, // Arousal
  Compass, // Autonomy
  Target, // Competence
  Users, // Relatedness
  Brain, // CognitiveClarity
  Flame, // PerceivedStakes
  ShieldCheck, // SocialSafety
  Scale, // MoralAlignment
  TrendingUp,
  Edit2,
} from 'lucide-react'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { useConfirmDialog } from '@/components/ui/confirm-dialog'

// Character metrics based on Affective Circumplex + Self-Determination Theory
// Aligned with src/domains/storytell../types.ts
interface CharacterMetrics {
  valence: number // -100 to +100: Emotional tone (negative to positive)
  arousal: number // 0-100: Energy/activation level
  autonomy: number // 0-100: Perceived freedom (SDT)
  competence: number // 0-100: Belief in capability (SDT)
  relatedness: number // 0-100: Sense of connection (SDT)
  cognitiveClarity: number // 0-100: Mental sharpness
  perceivedStakes: number // 0-100: How much is on the line
  socialSafety: number // 0-100: Perceived safety in social context
  moralAlignment: number // 0-100: Alignment between actions and values
  transformation: number // 0-100: Arc progress
}

interface Character {
  id: string
  name: string
  role: string
  gender?: string
  characterPrompt?: string
  // Core metrics from database
  valence?: number
  arousal?: number
  autonomy?: number
  competence?: number
  relatedness?: number
  cognitiveClarity?: number
  perceivedStakes?: number
  socialSafety?: number
  moralAlignment?: number
  transformation?: number
  // Meta
  mbti?: string
  voiceSignature?: string
  portraitUrl?: string
}

// Metric configuration for UI - aligned with backend psychological model
const METRIC_CONFIG: {
  key: keyof CharacterMetrics
  label: string
  icon: any // Use any or Import LucideIcon if possible
  color: string
  lowLabel: string
  highLabel: string
  isValence?: boolean // Special handling for -100 to +100 scale
}[] = [
    {
      key: 'valence',
      label: 'Mood',
      icon: Heart,
      color: 'text-pink-400',
      lowLabel: 'Negative',
      highLabel: 'Positive',
      isValence: true,
    },
    {
      key: 'arousal',
      label: 'Energy',
      icon: Zap,
      color: 'text-yellow-400',
      lowLabel: 'Calm',
      highLabel: 'Activated',
    },
    {
      key: 'autonomy',
      label: 'Freedom',
      icon: Compass,
      color: 'text-blue-400',
      lowLabel: 'Constrained',
      highLabel: 'Free',
    },
    {
      key: 'competence',
      label: 'Confidence',
      icon: Target,
      color: 'text-green-400',
      lowLabel: 'Doubt',
      highLabel: 'Capable',
    },
    {
      key: 'relatedness',
      label: 'Connection',
      icon: Users,
      color: 'text-cyan-400',
      lowLabel: 'Isolated',
      highLabel: 'Connected',
    },
    {
      key: 'cognitiveClarity',
      label: 'Clarity',
      icon: Brain,
      color: 'text-purple-400',
      lowLabel: 'Confused',
      highLabel: 'Sharp',
    },
    {
      key: 'perceivedStakes',
      label: 'Tension',
      icon: Flame,
      color: 'text-orange-400',
      lowLabel: 'Low',
      highLabel: 'Critical',
    },
    {
      key: 'socialSafety',
      label: 'Security',
      icon: ShieldCheck,
      color: 'text-teal-400',
      lowLabel: 'Threatened',
      highLabel: 'Safe',
    },
    {
      key: 'moralAlignment',
      label: 'Integrity',
      icon: Scale,
      color: 'text-indigo-400',
      lowLabel: 'Compromised',
      highLabel: 'Aligned',
    },
    {
      key: 'transformation',
      label: 'Arc Progress',
      icon: TrendingUp,
      color: 'text-emerald-400',
      lowLabel: 'Start',
      highLabel: 'Complete',
    },
  ]

interface CharacterPanelProps {
  characters: Character[]
  onUpdate?: (characterId: string, updates: Partial<Character>) => void
  onCreate?: (character: Partial<Character>) => void
  onDelete?: (characterId: string) => void
  projectId?: string
  // NEW: For beat-linked metrics
  selectedBeatId?: string | null
  episodeId?: string | null
  // NEW: Shimmer loading state
  isLoading?: boolean
}
export const CharacterPanel: React.FC<CharacterPanelProps> = ({
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
  const [editingCharacter, setEditingCharacter] = useState<Character | null>(null)
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
              const getVal = (key: string, def: number) => snap[key] ?? snap[key.replace(/[A-Z]/g, l => `_${l.toLowerCase()}`)] ?? def
              snapshotMap[snap.characterId] = {
                valence: snap.valence ?? snap.stress_level ?? snap.stressLevel ?? 0,
                arousal: getVal('arousal', 50),
                autonomy: getVal('autonomy', 60),
                competence: getVal('competence', 60),
                relatedness: getVal('relatedness', 50),
                cognitiveClarity: getVal('cognitiveClarity', 70),
                perceivedStakes: getVal('perceivedStakes', 40),
                socialSafety: getVal('socialSafety', 60),
                moralAlignment: getVal('moralAlignment', 70),
                transformation: snap.transformationProgress ?? snap.transformation ?? snap.transformation_progress ?? 0,
              }
            }
            setBeatSnapshots(snapshotMap)
          }
        })
        .catch(err => console.error('Failed to fetch character snapshots:', err))
    } else {
      // No beat selected - clear snapshots to show base character data
      setBeatSnapshots({})
    }
  }, [selectedBeatId, episodeId])

  // Merge base character with beat-specific snapshot
  const getCharacterWithSnapshot = (char: Character): Character => {
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
            <div key={i} className="bg-[#191919] border border-white/5 rounded-lg p-3 h-20">
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
        <div className="flex items-center justify-between">
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
          mode="create"
        />

        {/* Edit Dialog */}
        <CharacterCreationDialog
          isOpen={!!editingCharacter}
          onClose={() => setEditingCharacter(null)}
          onCreate={() => { }} // Not used in edit mode
          onUpdate={(id, updates) => {
            if (onUpdate) onUpdate(id, updates)
            setEditingCharacter(null)
          }}
          projectId={projectId}
          mode="edit"
          initialData={
            editingCharacter
              ? {
                id: editingCharacter.id,
                name: editingCharacter.name,
                role: editingCharacter.role,
                gender: editingCharacter.gender,
                mbti: editingCharacter.mbti,
                description: editingCharacter.characterPrompt,
                portraitUrl: editingCharacter.portraitUrl,
                // Map metrics from character state
                valence: editingCharacter.valence,
                arousal: editingCharacter.arousal,
                autonomy: editingCharacter.autonomy,
                competence: editingCharacter.competence,
                relatedness: editingCharacter.relatedness,
                cognitiveClarity: editingCharacter.cognitiveClarity,
                perceivedStakes: editingCharacter.perceivedStakes,
                socialSafety: editingCharacter.socialSafety,
                moralAlignment: editingCharacter.moralAlignment,
              }
              : undefined
          }
        />
      </div>
    </TooltipProvider>
  )
}

interface CharacterCardProps {
  character: Character
  onUpdate?: (characterId: string, updates: Partial<Character>) => void
  onDelete?: (characterId: string) => void
  onEdit?: (character: Character) => void
  isDeleting?: boolean
}

const CharacterCard: React.FC<CharacterCardProps> = ({ character, onUpdate, onDelete, onEdit, isDeleting }) => {
  const [isExpanded, setIsExpanded] = useState(false)
  const { confirm, ConfirmDialogComponent } = useConfirmDialog()

  const handleDelete = async () => {
    const confirmed = await confirm({
      title: 'Delete Character',
      description: `Are you sure you want to delete ${character.name}? This action cannot be undone.`,
      confirmLabel: 'Delete',
      cancelLabel: 'Cancel',
      variant: 'destructive',
    })
    if (confirmed && onDelete) {
      onDelete(character.id)
    }
  }

  return (
    <div className="bg-[#191919] border border-border rounded-lg p-3 space-y-3">
      <div
        className="flex items-center justify-between cursor-pointer"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-xs font-bold text-primary border border-primary/30">
            {character.name[0]}
          </div>
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
          {/* Character Metrics Grid */}
          <div className="space-y-2">
            <div className="text-[10px] text-muted-foreground uppercase tracking-wider font-bold mb-2">
              Character Metrics
            </div>
            {METRIC_CONFIG.map(metric => {
              // Robust lookup for both camelCase and snake_case (db vs local)
              const camelKey = metric.key as string
              const snakeKey = camelKey.replace(/[A-Z]/g, l => `_${l.toLowerCase()}`)
              const rawValue = (character as any)[camelKey] ?? (character as any)[snakeKey]

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

              const Icon = metric.icon

              // High risk conditions for new metrics
              const isHighRisk =
                (metric.key === 'valence' && value < -50) || // Very negative mood
                (metric.key === 'autonomy' && value < 25) || // Feels trapped
                (metric.key === 'socialSafety' && value < 25) || // Feels threatened
                (metric.key === 'perceivedStakes' && value > 85) || // Extremely high stakes
                (metric.key === 'moralAlignment' && value < 25) // Acting against values

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
