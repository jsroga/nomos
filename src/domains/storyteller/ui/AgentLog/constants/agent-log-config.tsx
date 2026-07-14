import React from 'react'
import {
  Bot,
  Sparkles,
  Brain,
  Lightbulb,
  Scale,
  Eye,
  Pen,
  User,
} from 'lucide-react'
import { AgentWireId } from '@/shared/chat/ui/constants/agent-log'
import {
  AgentLogTailwindColor,
  StorytellerAgentWireId,
} from './agent-log'

export interface AgentLogStyleConfig {
  color: string
  icon: React.ReactNode
}

export const STORYTELLER_AGENT_LOG_CONFIG: Record<string, AgentLogStyleConfig> = {
  [AgentWireId.Showrunner]: {
    color: AgentLogTailwindColor.ShowrunnerBadge,
    icon: <Sparkles className="w-3.5 h-3.5" />,
  },
  [AgentWireId.PlotArchitect]: {
    color: AgentLogTailwindColor.Blue,
    icon: <Lightbulb className="w-3.5 h-3.5" />,
  },
  [AgentWireId.CharacterPsychology]: {
    color: AgentLogTailwindColor.Purple,
    icon: <Brain className="w-3.5 h-3.5" />,
  },
  [AgentWireId.ConsequenceTracker]: {
    color: AgentLogTailwindColor.Green,
    icon: <Bot className="w-3.5 h-3.5" />,
  },
  [AgentWireId.DevilsAdvocate]: {
    color: AgentLogTailwindColor.Red,
    icon: <Scale className="w-3.5 h-3.5" />,
  },
  [AgentWireId.VisualMoment]: {
    color: AgentLogTailwindColor.Cyan,
    icon: <Eye className="w-3.5 h-3.5" />,
  },
  [AgentWireId.Writer]: {
    color: AgentLogTailwindColor.Orange,
    icon: <Pen className="w-3.5 h-3.5" />,
  },
  [AgentWireId.User]: {
    color: AgentLogTailwindColor.Primary,
    icon: <User className="w-3.5 h-3.5" />,
  },
  [AgentWireId.PremiseArchitectPascal]: {
    color: AgentLogTailwindColor.Indigo,
    icon: <Lightbulb className="w-3.5 h-3.5" />,
  },
  [AgentWireId.Supervisor]: {
    color: AgentLogTailwindColor.ShowrunnerBadge,
    icon: <Sparkles className="w-3.5 h-3.5" />,
  },
  [StorytellerAgentWireId.Psychologist]: {
    color: AgentLogTailwindColor.Pink,
    icon: <Brain className="w-3.5 h-3.5" />,
  },
  [StorytellerAgentWireId.Gardener]: {
    color: AgentLogTailwindColor.Emerald,
    icon: <Pen className="w-3.5 h-3.5" />,
  },
  [StorytellerAgentWireId.Storyteller]: {
    color: AgentLogTailwindColor.Amber,
    icon: <Sparkles className="w-3.5 h-3.5" />,
  },
  [StorytellerAgentWireId.CreativeDirectorGrrm]: {
    color: AgentLogTailwindColor.Rose,
    icon: <Sparkles className="w-3.5 h-3.5" />,
  },
  [StorytellerAgentWireId.CreativeDirectorGilligan]: {
    color: AgentLogTailwindColor.Yellow,
    icon: <Eye className="w-3.5 h-3.5" />,
  },
  [StorytellerAgentWireId.Grrm]: {
    color: AgentLogTailwindColor.Rose,
    icon: <Sparkles className="w-3.5 h-3.5" />,
  },
  [StorytellerAgentWireId.Gilligan]: {
    color: AgentLogTailwindColor.Yellow,
    icon: <Eye className="w-3.5 h-3.5" />,
  },
}
