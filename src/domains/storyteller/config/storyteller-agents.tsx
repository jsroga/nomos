import { Bot, User, Brain, Lightbulb, Scale, Eye, Pen } from 'lucide-react'
import type { AgentConfigMap } from '@/domains/chat/types'

export const STORYTELLER_AGENT_CONFIG: AgentConfigMap = {
  Showrunner: {
    color: 'text-primary',
    bgColor: 'bg-primary/10 border-primary/30',
    icon: <Brain className="w-4 h-4" />,
  },
  PlotArchitect: {
    color: 'text-blue-400/80',
    bgColor: 'bg-blue-400/10 border-blue-400/20',
    icon: <Lightbulb className="w-4 h-4" />,
  },
  CharacterPsychology: {
    color: 'text-purple-400/80',
    bgColor: 'bg-purple-500/10 border-purple-500/30',
    icon: <Brain className="w-4 h-4" />,
  },
  ConsequenceTracker: {
    color: 'text-green-400/80',
    bgColor: 'bg-green-500/10 border-green-500/30',
    icon: <Bot className="w-4 h-4" />,
  },
  DevilsAdvocate: {
    color: 'text-red-400/80',
    bgColor: 'bg-red-500/10 border-red-500/30',
    icon: <Scale className="w-4 h-4" />,
  },
  VisualMoment: {
    color: 'text-cyan-400/80',
    bgColor: 'bg-cyan-500/10 border-cyan-500/30',
    icon: <Eye className="w-4 h-4" />,
  },
  Writer: {
    color: 'text-orange-400/80',
    bgColor: 'bg-orange-500/10 border-orange-500/30',
    icon: <Pen className="w-4 h-4" />,
  },
  User: {
    color: 'text-primary',
    bgColor: 'bg-primary/5 border-primary/20',
    icon: <User className="w-4 h-4" />,
  },
  _fallback: {
    color: 'text-muted-foreground',
    bgColor: 'bg-muted/10 border-border/20',
    icon: <Bot className="w-3.5 h-3.5" />,
  },
}
