import { Bot, User, Brain, Lightbulb, Scale, Eye, Pen, BookOpen } from 'lucide-react'
import type { AgentConfigMap } from '@/domains/chat'

export const STORYTELLER_AGENT_CONFIG: AgentConfigMap = {
  // NEW: GRRM solo model agents (P1-4)
  'GRRM Author': {
    color: 'text-primary',
    bgColor: 'bg-primary/10 border-primary/30',
    icon: <Pen className="w-4 h-4" />,
  },
  'Beat Planner': {
    color: 'text-blue-400/80',
    bgColor: 'bg-blue-400/10 border-blue-400/20',
    icon: <BookOpen className="w-4 h-4" />,
  },
  
  // LEGACY: Old council/judges agents (deprecated — still on disk, not used in new flow)
  // TODO(P2-1): Remove these once deletion wave completes
  Showrunner: {
    color: 'text-muted-foreground/50',
    bgColor: 'bg-muted/5 border-border/10',
    icon: <Brain className="w-4 h-4" />,
  },
  PlotArchitect: {
    color: 'text-muted-foreground/50',
    bgColor: 'bg-muted/5 border-border/10',
    icon: <Lightbulb className="w-4 h-4" />,
  },
  CharacterPsychology: {
    color: 'text-muted-foreground/50',
    bgColor: 'bg-muted/5 border-border/10',
    icon: <Brain className="w-4 h-4" />,
  },
  ConsequenceTracker: {
    color: 'text-muted-foreground/50',
    bgColor: 'bg-muted/5 border-border/10',
    icon: <Bot className="w-4 h-4" />,
  },
  DevilsAdvocate: {
    color: 'text-muted-foreground/50',
    bgColor: 'bg-muted/5 border-border/10',
    icon: <Scale className="w-4 h-4" />,
  },
  VisualMoment: {
    color: 'text-muted-foreground/50',
    bgColor: 'bg-muted/5 border-border/10',
    icon: <Eye className="w-4 h-4" />,
  },
  Writer: {
    color: 'text-muted-foreground/50',
    bgColor: 'bg-muted/5 border-border/10',
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
