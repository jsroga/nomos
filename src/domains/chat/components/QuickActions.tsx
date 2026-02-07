'use client'

import React from 'react'
import { cn } from '@/lib/utils'
import {
  RefreshCw,
  ArrowRight,
  MessageSquare,
  Edit3,
  Plus,
  Sparkles,
  Lightbulb,
  Music,
  Users,
  FileText,
  Cpu,
  Scale,
  TrendingUp,
  Search,
  Gamepad2,
} from 'lucide-react'

export interface QuickAction {
  id: string
  label: string
  icon?: React.ReactNode
  variant?: 'default' | 'primary' | 'subtle'
  onClick: () => void
}

interface QuickActionsProps {
  actions: QuickAction[]
  className?: string
}

// Pre-defined action templates for common scenarios
export const createQuickActions = {
  afterGeneration: (onRegenerate: () => void, onContinue: () => void): QuickAction[] => [
    {
      id: 'regenerate',
      label: 'Regenerate',
      icon: <RefreshCw className="w-3 h-3" />,
      onClick: onRegenerate,
    },
    {
      id: 'continue',
      label: 'Continue',
      icon: <ArrowRight className="w-3 h-3" />,
      variant: 'primary',
      onClick: onContinue,
    },
  ],

  afterPremise: (
    onGenerateBeats: () => void,
    onEditPremise: () => void,
    onAddSoundtrack: () => void
  ): QuickAction[] => [
    {
      id: 'generate-beats',
      label: 'Generate Beats',
      icon: <Sparkles className="w-3 h-3" />,
      variant: 'primary',
      onClick: onGenerateBeats,
    },
    {
      id: 'edit-premise',
      label: 'Edit Premise',
      icon: <Edit3 className="w-3 h-3" />,
      onClick: onEditPremise,
    },
    {
      id: 'add-soundtrack',
      label: 'Add Soundtrack',
      icon: <Music className="w-3 h-3" />,
      onClick: onAddSoundtrack,
    },
  ],

  afterBeats: (onWriteScript: () => void, onAddBeat: () => void): QuickAction[] => [
    {
      id: 'write-script',
      label: 'Write Script',
      icon: <FileText className="w-3 h-3" />,
      variant: 'primary',
      onClick: onWriteScript,
    },
    { id: 'add-beat', label: 'Add Beat', icon: <Plus className="w-3 h-3" />, onClick: onAddBeat },
  ],

  afterWorldBuilding: (
    onCreateCharacter: () => void,
    onAddRule: () => void,
    onGenerateEpisodes: () => void
  ): QuickAction[] => [
    {
      id: 'create-character',
      label: 'Create Character',
      icon: <Users className="w-3 h-3" />,
      onClick: onCreateCharacter,
    },
    {
      id: 'add-rule',
      label: 'Add World Rule',
      icon: <Lightbulb className="w-3 h-3" />,
      onClick: onAddRule,
    },
    {
      id: 'generate-episodes',
      label: 'Generate Episodes',
      icon: <Sparkles className="w-3 h-3" />,
      variant: 'primary',
      onClick: onGenerateEpisodes,
    },
  ],

  generic: (onAskQuestion: () => void, onSuggestIdea: () => void): QuickAction[] => [
    {
      id: 'ask-question',
      label: 'Ask a question',
      icon: <MessageSquare className="w-3 h-3" />,
      onClick: onAskQuestion,
    },
    {
      id: 'suggest-idea',
      label: 'Suggest an idea',
      icon: <Lightbulb className="w-3 h-3" />,
      onClick: onSuggestIdea,
    },
  ],
}

export const QuickActions: React.FC<QuickActionsProps> = ({ actions, className }) => {
  if (actions.length === 0) return null

  return (
    <div className={cn('flex flex-wrap gap-2', className)}>
      {actions.map(action => (
        <button
          key={action.id}
          onClick={action.onClick}
          className={cn(
            'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all',
            'border border-border/40 bg-muted/20 text-muted-foreground hover:text-foreground hover:bg-muted/40 hover:border-border/60 active:scale-[0.98]'
          )}
        >
          {action.icon && <span className="opacity-70">{action.icon}</span>}
          <span>{action.label}</span>
        </button>
      ))}
    </div>
  )
}

// Context-aware quick actions based on current state
interface SmartQuickActionsProps {
  currentPhase: 'premise' | 'breaking' | 'writing' | 'world_building' | 'loop_design' | 'complete'
  lastActionType?: string
  onSendMessage: (message: string) => void
  className?: string
  proposeLabel?: string
  proposePrompt?: string
}

export const SmartQuickActions: React.FC<SmartQuickActionsProps> = ({
  currentPhase,
  lastActionType,
  onSendMessage,
  className,
  proposeLabel = 'Propose next step',
  proposePrompt = 'Propose the next logical step for this story.',
}) => {
  const getActionsForPhase = (): QuickAction[] => {
    const proposeNextStep: QuickAction = {
      id: 'propose-next',
      label: proposeLabel,
      icon: <Sparkles className="w-4 h-4" />,
      onClick: () => onSendMessage(proposePrompt),
    }

    let phaseActions: QuickAction[] = []

    switch (currentPhase) {
      case 'premise':
        phaseActions = [
          {
            id: 'generate-premise',
            label: 'Generate Premise',
            icon: <Sparkles className="w-4 h-4" />,
            onClick: () =>
              onSendMessage('Generate an episode premise using the Ozymandias framework.'),
          },
          {
            id: 'suggest-theme',
            label: 'Suggest Theme',
            icon: <Lightbulb className="w-4 h-4" />,
            onClick: () => onSendMessage('Suggest some thematic ideas for this episode.'),
          },
        ]
        break

      case 'breaking':
        phaseActions = [
          {
            id: 'generate-beats',
            label: 'Generate Story Beats',
            icon: <Sparkles className="w-4 h-4" />,
            onClick: () => onSendMessage('Break this premise into detailed story beats.'),
          },
          {
            id: 'add-twist',
            label: 'Add Plot Twist',
            icon: <RefreshCw className="w-4 h-4" />,
            onClick: () => onSendMessage('Suggest a surprising plot twist for this story.'),
          },
        ]
        break

      case 'writing':
        phaseActions = [
          {
            id: 'write-scene',
            label: 'Write Next Scene',
            icon: <FileText className="w-4 h-4" />,
            onClick: () => onSendMessage('Write the next scene in the script.'),
          },
          {
            id: 'improve-dialogue',
            label: 'Improve Dialogue',
            icon: <Edit3 className="w-4 h-4" />,
            onClick: () => onSendMessage('Help me improve the dialogue in the current scene.'),
          },
        ]
        break

      case 'world_building':
        phaseActions = [
          {
            id: 'create-faction',
            label: 'Create Faction',
            icon: <Users className="w-4 h-4" />,
            onClick: () => onSendMessage('Create a new faction for this world.'),
          },
          {
            id: 'add-rule',
            label: 'Add World Rule',
            icon: <Lightbulb className="w-4 h-4" />,
            onClick: () => onSendMessage('Add a new rule or constraint to this world.'),
          },
          {
            id: 'generate-roadmap',
            label: 'Generate Season Roadmap',
            icon: <Sparkles className="w-4 h-4" />,
            onClick: () => onSendMessage('Generate an episode roadmap for the season.'),
          },
        ]
        break

      case 'loop_design':
        phaseActions = [
          {
            id: 'design-mechanics',
            label: 'Design Core Mechanics',
            icon: <Cpu className="w-4 h-4" />,
            onClick: () =>
              onSendMessage(
                'Design the core mechanics for this game loop. Focus on genre-defining innovation.'
              ),
          },
          {
            id: 'generate-loop',
            label: 'Generate Loop Nodes',
            icon: <Gamepad2 className="w-4 h-4" />,
            onClick: () => onSendMessage('Generate game loop nodes based on my game concept.'),
          },
          {
            id: 'analyze-balance',
            label: 'Analyze Balance',
            icon: <Scale className="w-4 h-4" />,
            onClick: () =>
              onSendMessage('Analyze the balance of effort vs reward in my current game loop.'),
          },
          {
            id: 'add-progression',
            label: 'Add Progression',
            icon: <TrendingUp className="w-4 h-4" />,
            onClick: () => onSendMessage('Design a progression system for this game loop.'),
          },
          {
            id: 'market-analysis',
            label: 'Market Analysis',
            icon: <Search className="w-4 h-4" />,
            onClick: () => onSendMessage('Run a market analysis for this game concept.'),
          },
        ]
        break

      default:
        phaseActions = [
          {
            id: 'ask',
            label: 'Ask a question',
            icon: <MessageSquare className="w-4 h-4" />,
            onClick: () => {}, // Will be handled by input focus
          },
        ]
    }

    return [proposeNextStep, ...phaseActions]
  }

  return <QuickActions actions={getActionsForPhase()} className={className} />
}
