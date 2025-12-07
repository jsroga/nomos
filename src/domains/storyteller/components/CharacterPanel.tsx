import React, { useState } from 'react'
import { CharacterCreationDialog } from './CharacterCreationDialog'
import { Slider } from '@/components/ui/slider'
import { Button } from '@/components/ui/button'
import {
  Plus,
  ChevronUp,
  ChevronDown,
  Save,
  Trash2,
  Activity,
  Shield,
  Zap,
  Scale,
  Sun,
  Users,
  TrendingUp,
} from 'lucide-react'

// Character metrics that can change per beat (0-100)
interface CharacterMetrics {
  stress: number // Psychological pressure
  trust: number // Trust in others/world
  power: number // Perceived control/agency
  morality: number // Moral standing (0=corrupt, 100=pure)
  hope: number // Optimism/belief in positive outcome
  isolation: number // Social disconnection
  transformation: number // Progress along character arc
}

interface Character {
  id: string
  name: string
  role: string
  gender?: string
  characterPrompt?: string
  stress: number
  transformation: number
  // Extended metrics
  trust?: number
  power?: number
  morality?: number
  hope?: number
  isolation?: number
  mbti?: string
  voiceSignature?: string
  emotionHistory?: { timestamp: number; value: number; note: string }[]
}

// Metric configuration for UI
const METRIC_CONFIG: {
  key: keyof CharacterMetrics
  label: string
  icon: React.ElementType
  color: string
  lowLabel: string
  highLabel: string
}[] = [
  {
    key: 'stress',
    label: 'Stress',
    icon: Activity,
    color: 'text-red-400',
    lowLabel: 'Calm',
    highLabel: 'Breaking',
  },
  {
    key: 'trust',
    label: 'Trust',
    icon: Shield,
    color: 'text-blue-400',
    lowLabel: 'Paranoid',
    highLabel: 'Trusting',
  },
  {
    key: 'power',
    label: 'Power',
    icon: Zap,
    color: 'text-yellow-400',
    lowLabel: 'Powerless',
    highLabel: 'In Control',
  },
  {
    key: 'morality',
    label: 'Morality',
    icon: Scale,
    color: 'text-purple-400',
    lowLabel: 'Corrupt',
    highLabel: 'Righteous',
  },
  {
    key: 'hope',
    label: 'Hope',
    icon: Sun,
    color: 'text-amber-400',
    lowLabel: 'Despair',
    highLabel: 'Hopeful',
  },
  {
    key: 'isolation',
    label: 'Isolation',
    icon: Users,
    color: 'text-cyan-400',
    lowLabel: 'Connected',
    highLabel: 'Alone',
  },
  {
    key: 'transformation',
    label: 'Arc Progress',
    icon: TrendingUp,
    color: 'text-green-400',
    lowLabel: 'Start',
    highLabel: 'Complete',
  },
]

interface CharacterPanelProps {
  characters: Character[]
  onUpdate?: (characterId: string, updates: Partial<Character>) => void
  onCreate?: (character: Partial<Character>) => void
  onDelete?: (characterId: string) => void
  projectId?: string // For project-scoped style references
}
export const CharacterPanel: React.FC<CharacterPanelProps> = ({
  characters,
  onUpdate,
  onCreate,
  onDelete,
  projectId,
}) => {
  const [isCreationOpen, setIsCreationOpen] = useState(false)

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
          Cast ({characters.length})
        </h3>
        <Button
          size="sm"
          variant="ghost"
          className="h-6 w-6 p-0"
          onClick={() => setIsCreationOpen(true)}
        >
          <Plus size={14} />
        </Button>
      </div>

      <div className="space-y-3 max-h-[400px] overflow-y-auto pr-1">
        {characters.map(char => (
          <CharacterCard key={char.id} character={char} onUpdate={onUpdate} onDelete={onDelete} />
        ))}
        {characters.length === 0 && (
          <div className="text-center py-4 text-muted-foreground text-xs">
            No characters yet. Click + to add one.
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
      />
    </div>
  )
}

interface CharacterCardProps {
  character: Character
  onUpdate?: (characterId: string, updates: Partial<Character>) => void
  onDelete?: (characterId: string) => void
}

const CharacterCard: React.FC<CharacterCardProps> = ({ character, onUpdate, onDelete }) => {
  const [isEditing, setIsEditing] = useState(false)
  const [editState, setEditState] = useState<Partial<Character>>(character)
  const [isExpanded, setIsExpanded] = useState(false)

  const handleSave = () => {
    if (onUpdate) {
      onUpdate(character.id, editState)
    }
    setIsEditing(false)
  }

  return (
    <div className="bg-card border border-border rounded-lg p-3 space-y-3">
      <div
        className="flex items-center justify-between cursor-pointer"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-xs font-bold text-primary border border-primary/30">
            {character.name[0]}
          </div>
          <div>
            <div className="font-bold text-sm leading-none">{character.name}</div>
            <div className="text-[10px] text-muted-foreground uppercase tracking-wider">
              {character.role}
            </div>
          </div>
        </div>
        {isExpanded ? (
          <ChevronUp size={14} className="text-muted-foreground" />
        ) : (
          <ChevronDown size={14} className="text-muted-foreground" />
        )}
      </div>

      {isExpanded && (
        <div className="space-y-3 pt-2 border-t border-border/50">
          {/* Character Metrics Grid */}
          <div className="space-y-2">
            <div className="text-[10px] text-muted-foreground uppercase tracking-wider font-bold mb-2">
              Character Metrics
            </div>
            {METRIC_CONFIG.map(metric => {
              const value = (editState as any)[metric.key] ?? 50
              const Icon = metric.icon
              const isHighRisk =
                (metric.key === 'stress' && value > 80) ||
                (metric.key === 'isolation' && value > 80) ||
                (metric.key === 'morality' && value < 20) ||
                (metric.key === 'hope' && value < 20)

              return (
                <div key={metric.key} className="space-y-0.5">
                  <div className="flex justify-between items-center text-xs">
                    <div className="flex items-center gap-1.5">
                      <Icon size={12} className={metric.color} />
                      <span className="text-muted-foreground">{metric.label}</span>
                    </div>
                    <span
                      className={
                        isHighRisk ? 'text-destructive font-bold' : 'text-muted-foreground'
                      }
                    >
                      {value}%
                    </span>
                  </div>
                  {isEditing ? (
                    <Slider
                      value={[value]}
                      max={100}
                      step={1}
                      onValueChange={([val]) =>
                        setEditState(prev => ({ ...prev, [metric.key]: val }))
                      }
                      className="py-0.5"
                    />
                  ) : (
                    <div className="relative">
                      <div className="h-1 bg-secondary rounded-full overflow-hidden">
                        <div
                          className={`h-full transition-all duration-500 ${isHighRisk ? 'bg-destructive' : ''}`}
                          style={{
                            width: `${value}%`,
                            backgroundColor: isHighRisk
                              ? undefined
                              : `hsl(var(--primary) / ${0.5 + value / 200})`,
                          }}
                        />
                      </div>
                      <div className="flex justify-between text-[9px] text-muted-foreground/50 mt-0.5">
                        <span>{metric.lowLabel}</span>
                        <span>{metric.highLabel}</span>
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>

          {/* MBTI & Voice */}
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="bg-secondary/50 p-2 rounded">
              <div className="text-[10px] text-muted-foreground uppercase mb-1">MBTI</div>
              {isEditing ? (
                <input
                  className="w-full bg-background border border-border rounded px-2 py-1 text-xs"
                  value={editState.mbti || ''}
                  onChange={e => setEditState(prev => ({ ...prev, mbti: e.target.value }))}
                  placeholder="INTJ"
                />
              ) : (
                <div className="font-mono">{character.mbti || '????'}</div>
              )}
            </div>
            <div className="bg-secondary/50 p-2 rounded">
              <div className="text-[10px] text-muted-foreground uppercase mb-1">Voice</div>
              {isEditing ? (
                <input
                  className="w-full bg-background border border-border rounded px-2 py-1 text-xs"
                  value={editState.voiceSignature || ''}
                  onChange={e =>
                    setEditState(prev => ({ ...prev, voiceSignature: e.target.value }))
                  }
                  placeholder="Gruff, terse"
                />
              ) : (
                <div className="truncate" title={character.voiceSignature}>
                  {character.voiceSignature || 'Undefined'}
                </div>
              )}
            </div>
          </div>

          {/* Gender & Prompt */}
          <div className="space-y-2 text-xs">
            <div className="bg-secondary/50 p-2 rounded">
              <div className="text-[10px] text-muted-foreground uppercase mb-1">Gender</div>
              {isEditing ? (
                <input
                  className="w-full bg-background border border-border rounded px-2 py-1 text-xs"
                  value={editState.gender || ''}
                  onChange={e => setEditState(prev => ({ ...prev, gender: e.target.value }))}
                  placeholder="Male/Female/Other"
                />
              ) : (
                <div>{character.gender || 'Not specified'}</div>
              )}
            </div>
            <div className="bg-secondary/50 p-2 rounded">
              <div className="text-[10px] text-muted-foreground uppercase mb-1">
                Character Prompt
              </div>
              {isEditing ? (
                <textarea
                  className="w-full bg-background border border-border rounded px-2 py-1 text-xs min-h-[60px]"
                  value={editState.characterPrompt || ''}
                  onChange={e =>
                    setEditState(prev => ({ ...prev, characterPrompt: e.target.value }))
                  }
                  placeholder="Specific instructions for this character..."
                />
              ) : (
                <div className="line-clamp-3 italic text-muted-foreground">
                  {character.characterPrompt || 'No prompt set.'}
                </div>
              )}
            </div>
          </div>

          <div className="flex justify-between gap-2 pt-2">
            {onDelete && (
              <Button
                size="sm"
                variant="ghost"
                className="h-6 text-xs text-destructive hover:text-destructive hover:bg-destructive/10"
                onClick={() => {
                  if (confirm(`Delete ${character.name}?`)) {
                    onDelete(character.id)
                  }
                }}
              >
                <Trash2 size={12} />
              </Button>
            )}
            <div className="flex gap-2">
              {isEditing ? (
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-6 text-xs gap-1 text-primary"
                  onClick={handleSave}
                >
                  <Save size={12} /> Save
                </Button>
              ) : (
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-6 text-xs"
                  onClick={() => setIsEditing(true)}
                >
                  Edit
                </Button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
