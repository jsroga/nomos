import { Bot, User, BookOpen, Pen, ScanSearch, Scale, SearchCheck } from 'lucide-react'
import type { ReactNode } from 'react'

/**
 * Structural twin of `AgentConfig`/`AgentConfigMap` from the chat platform.
 * Declared locally because cross-domain imports are lint errors; PLAN-V2 3.1
 * moves chat to `@/shared/chat` — re-point this to the shared type then
 * (structural compatibility is what the chat components check).
 */
interface StorytellerAgentStyle {
  color: string
  bgColor?: string
  icon: ReactNode
}

/**
 * Chat styling for the agents that actually exist in the GRRM solo flow
 * (chat adapter + author + planner + three narrow critics). Unknown agent
 * names render via `_fallback` — never add styling for deleted agents.
 */
export const STORYTELLER_AGENT_CONFIG: Record<string, StorytellerAgentStyle> = {
  Storyteller: {
    color: 'text-primary',
    bgColor: 'bg-primary/10 border-primary/30',
    icon: <Bot className="w-4 h-4" />,
  },
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
  'Continuity Critic': {
    color: 'text-amber-400/80',
    bgColor: 'bg-amber-400/10 border-amber-400/20',
    icon: <SearchCheck className="w-4 h-4" />,
  },
  'Prose Critic': {
    color: 'text-amber-400/80',
    bgColor: 'bg-amber-400/10 border-amber-400/20',
    icon: <ScanSearch className="w-4 h-4" />,
  },
  'Stakes Critic': {
    color: 'text-amber-400/80',
    bgColor: 'bg-amber-400/10 border-amber-400/20',
    icon: <Scale className="w-4 h-4" />,
  },
  System: {
    color: 'text-muted-foreground',
    bgColor: 'bg-muted/10 border-border/20',
    icon: <Bot className="w-3.5 h-3.5" />,
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
