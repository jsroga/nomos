'use client'

import React from 'react'
import { cn } from '@/shared/data/utils'
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
import {
  QuickActionId,
  QuickActionLabel,
  SmartQuickActionPhase,
  SmartQuickActionPrompt,
  type QuickActionTemplate,
  QUICK_ACTION_AFTER_GENERATION,
  QUICK_ACTION_AFTER_PREMISE_TEMPLATES,
  QUICK_ACTION_AFTER_BEATS_TEMPLATES,
  QUICK_ACTION_AFTER_WORLD_BUILDING_TEMPLATES,
  QUICK_ACTION_GENERIC_TEMPLATES,
  SMART_QUICK_ACTION_PREMISE,
  SMART_QUICK_ACTION_BREAKING,
  SMART_QUICK_ACTION_WRITING,
  SMART_QUICK_ACTION_WORLD_BUILDING,
  SMART_QUICK_ACTION_LOOP_DESIGN,
  SMART_QUICK_ACTION_DEFAULT,
} from './constants/quick-actions'

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

const QUICK_ACTION_ICONS: Record<QuickActionId, React.ReactNode> = {
  [QuickActionId.Regenerate]: <RefreshCw className="w-3 h-3" />,
  [QuickActionId.Continue]: <ArrowRight className="w-3 h-3" />,
  [QuickActionId.GenerateBeats]: <Sparkles className="w-3 h-3" />,
  [QuickActionId.EditPremise]: <Edit3 className="w-3 h-3" />,
  [QuickActionId.AddSoundtrack]: <Music className="w-3 h-3" />,
  [QuickActionId.WriteScript]: <FileText className="w-3 h-3" />,
  [QuickActionId.AddBeat]: <Plus className="w-3 h-3" />,
  [QuickActionId.CreateCharacter]: <Users className="w-3 h-3" />,
  [QuickActionId.AddRule]: <Lightbulb className="w-3 h-3" />,
  [QuickActionId.GenerateEpisodes]: <Sparkles className="w-3 h-3" />,
  [QuickActionId.AskQuestion]: <MessageSquare className="w-3 h-3" />,
  [QuickActionId.SuggestIdea]: <Lightbulb className="w-3 h-3" />,
  [QuickActionId.ProposeNext]: <Sparkles className="w-4 h-4" />,
  [QuickActionId.GeneratePremise]: <Sparkles className="w-4 h-4" />,
  [QuickActionId.SuggestTheme]: <Lightbulb className="w-4 h-4" />,
  [QuickActionId.AddTwist]: <RefreshCw className="w-4 h-4" />,
  [QuickActionId.WriteScene]: <FileText className="w-4 h-4" />,
  [QuickActionId.ImproveDialogue]: <Edit3 className="w-4 h-4" />,
  [QuickActionId.CreateFaction]: <Users className="w-4 h-4" />,
  [QuickActionId.GenerateRoadmap]: <Sparkles className="w-4 h-4" />,
  [QuickActionId.DesignMechanics]: <Cpu className="w-4 h-4" />,
  [QuickActionId.GenerateLoop]: <Gamepad2 className="w-4 h-4" />,
  [QuickActionId.AnalyzeBalance]: <Scale className="w-4 h-4" />,
  [QuickActionId.AddProgression]: <TrendingUp className="w-4 h-4" />,
  [QuickActionId.MarketAnalysis]: <Search className="w-4 h-4" />,
  [QuickActionId.Ask]: <MessageSquare className="w-4 h-4" />,
}

function templateToQuickAction(
  template: QuickActionTemplate,
  onClick: () => void
): QuickAction {
  return {
    id: template.id,
    label: template.label,
    icon: QUICK_ACTION_ICONS[template.id],
    variant: template.variant,
    onClick,
  }
}

function templatesToQuickActions(
  templates: QuickActionTemplate[],
  handlers: Array<() => void>
): QuickAction[] {
  return templates.map((template, index) => templateToQuickAction(template, handlers[index]))
}

// Pre-defined action templates for common scenarios
export const createQuickActions = {
  afterGeneration: (onRegenerate: () => void, onContinue: () => void): QuickAction[] =>
    templatesToQuickActions(QUICK_ACTION_AFTER_GENERATION, [onRegenerate, onContinue]),

  afterPremise: (
    onGenerateBeats: () => void,
    onEditPremise: () => void,
    onAddSoundtrack: () => void
  ): QuickAction[] =>
    templatesToQuickActions(QUICK_ACTION_AFTER_PREMISE_TEMPLATES, [
      onGenerateBeats,
      onEditPremise,
      onAddSoundtrack,
    ]),

  afterBeats: (onWriteScript: () => void, onAddBeat: () => void): QuickAction[] =>
    templatesToQuickActions(QUICK_ACTION_AFTER_BEATS_TEMPLATES, [onWriteScript, onAddBeat]),

  afterWorldBuilding: (
    onCreateCharacter: () => void,
    onAddRule: () => void,
    onGenerateEpisodes: () => void
  ): QuickAction[] =>
    templatesToQuickActions(QUICK_ACTION_AFTER_WORLD_BUILDING_TEMPLATES, [
      onCreateCharacter,
      onAddRule,
      onGenerateEpisodes,
    ]),

  generic: (onAskQuestion: () => void, onSuggestIdea: () => void): QuickAction[] =>
    templatesToQuickActions(QUICK_ACTION_GENERIC_TEMPLATES, [onAskQuestion, onSuggestIdea]),
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
  currentPhase: `${SmartQuickActionPhase}`
  lastActionType?: string
  onSendMessage: (message: string) => void
  className?: string
  proposeLabel?: string
  proposePrompt?: string
}

export const SmartQuickActions: React.FC<SmartQuickActionsProps> = ({
  currentPhase,
  lastActionType: _lastActionType,
  onSendMessage,
  className,
  proposeLabel = QuickActionLabel.ProposeNextStep,
  proposePrompt = SmartQuickActionPrompt.ProposeNextStep,
}) => {
  const getActionsForPhase = (): QuickAction[] => {
    const proposeNextStep: QuickAction = {
      id: QuickActionId.ProposeNext,
      label: proposeLabel,
      icon: QUICK_ACTION_ICONS[QuickActionId.ProposeNext],
      onClick: () => onSendMessage(proposePrompt),
    }

    let phaseTemplates: QuickActionTemplate[] = []

    switch (currentPhase) {
      case SmartQuickActionPhase.Premise:
        phaseTemplates = SMART_QUICK_ACTION_PREMISE
        break
      case SmartQuickActionPhase.Breaking:
        phaseTemplates = SMART_QUICK_ACTION_BREAKING
        break
      case SmartQuickActionPhase.Writing:
        phaseTemplates = SMART_QUICK_ACTION_WRITING
        break
      case SmartQuickActionPhase.WorldBuilding:
        phaseTemplates = SMART_QUICK_ACTION_WORLD_BUILDING
        break
      case SmartQuickActionPhase.LoopDesign:
        phaseTemplates = SMART_QUICK_ACTION_LOOP_DESIGN
        break
      default:
        phaseTemplates = SMART_QUICK_ACTION_DEFAULT
    }

    const phaseActions = phaseTemplates.map(template =>
      templateToQuickAction(template, () => {
        if (template.prompt) {
          onSendMessage(template.prompt)
        }
      })
    )

    return [proposeNextStep, ...phaseActions]
  }

  return <QuickActions actions={getActionsForPhase()} className={className} />
}
