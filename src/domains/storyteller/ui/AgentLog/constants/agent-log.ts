/** Storyteller AgentLog wire values — extends shared chat agent-log constants. */

import {
  AGENT_DISPLAY_NAMES as SHARED_AGENT_DISPLAY_NAMES,
  AGENT_LOG_DEFAULT_COLOR,
  AGENT_LOG_SCROLL_BEHAVIOR,
  AGENT_NAME_CAMEL_CASE_SPLIT,
  AGENT_NAME_DELEGATE_PREFIX_PATTERN,
  AGENT_NAME_UNDERSCORE_REPLACEMENT,
  AgentWireId,
  DelegationPhrase,
  DELEGATION_ELLIPSIS_SUFFIX,
  DELEGATION_HANDOFF_PREFIX,
  MessageGroupType,
} from '@/shared/chat/ui/constants/agent-log'
import { ChatMessageRole } from '@/shared/chat/core/constants/chat-messages'
import { QuestionUrgency } from '@/domains/storyteller/core/types/enums'

export {
  AGENT_LOG_DEFAULT_COLOR,
  AGENT_LOG_SCROLL_BEHAVIOR,
  AGENT_NAME_CAMEL_CASE_SPLIT,
  AGENT_NAME_DELEGATE_PREFIX_PATTERN,
  AGENT_NAME_UNDERSCORE_REPLACEMENT,
  AgentWireId,
  ChatMessageRole,
  DelegationPhrase,
  DELEGATION_ELLIPSIS_SUFFIX,
  DELEGATION_HANDOFF_PREFIX,
  MessageGroupType,
  QuestionUrgency,
}

export enum StorytellerAgentWireId {
  Psychologist = 'Psychologist',
  Gardener = 'Gardener',
  Storyteller = 'Storyteller',
  CreativeDirectorGrrm = 'CreativeDirector_GRRM',
  CreativeDirectorGilligan = 'CreativeDirector_Gilligan',
  Grrm = 'GRRM',
  Gilligan = 'Gilligan',
}

export enum StorytellerAgentDisplayName {
  LogicGuardian = 'Logic Guardian',
  CharacterPsychologist = 'Character Psychologist',
  TheGardener = 'The Gardener',
  Storyteller = 'Storyteller',
  GrrmCreativeDirector = 'GRRM (Creative Director)',
  GilliganCreativeDirector = 'Vince Gilligan (Creative Director)',
  GeorgeRrMartin = 'George R.R. Martin',
  VinceGilligan = 'Vince Gilligan',
  ExtendedThinking = 'Extended Thinking',
  Thinking = 'Thinking',
}

export enum AgentLogTailwindColor {
  Primary = 'text-primary',
  MutedForeground = 'text-muted-foreground',
  Blue = 'text-blue-400/80',
  Purple = 'text-purple-400/80',
  Green = 'text-green-400/80',
  Red = 'text-red-400/80',
  Cyan = 'text-cyan-400/80',
  Orange = 'text-orange-400/80',
  Indigo = 'text-indigo-400/80',
  Pink = 'text-pink-400/80',
  Emerald = 'text-emerald-400/80',
  Amber = 'text-amber-400/80',
  Rose = 'text-rose-500/90',
  Yellow = 'text-yellow-500/90',
  ShowrunnerBadge =
    'flex items-center gap-1.5 px-2.5 py-0.5 rounded-full transition-all duration-300 bg-primary/10 border border-primary/30 text-primary',
}

export enum AgentLogUrlHost {
  YouTube = 'youtube.com',
  YouTubeShort = 'youtu.be',
}

export enum AgentLogMessageContent {
  ThinkingEllipsis = 'thinking...',
  ProcessStepsPrefix = 'Process: ',
  ProcessStepsSuffix = ' steps',
  HandingOffPrefix = 'Handing off to ',
  HandingOffSuffix = '...',
  YouTubeLinkPrefix = '▶ ',
}

export const STORYTELLER_AGENT_DISPLAY_NAMES: Record<string, string> = {
  ...SHARED_AGENT_DISPLAY_NAMES,
  [AgentWireId.ConsequenceTracker]: StorytellerAgentDisplayName.LogicGuardian,
  [StorytellerAgentWireId.Psychologist]: StorytellerAgentDisplayName.CharacterPsychologist,
  [StorytellerAgentWireId.Gardener]: StorytellerAgentDisplayName.TheGardener,
  [StorytellerAgentWireId.Storyteller]: StorytellerAgentDisplayName.Storyteller,
  [StorytellerAgentWireId.CreativeDirectorGrrm]: StorytellerAgentDisplayName.GrrmCreativeDirector,
  [StorytellerAgentWireId.CreativeDirectorGilligan]:
    StorytellerAgentDisplayName.GilliganCreativeDirector,
  [StorytellerAgentWireId.Grrm]: StorytellerAgentDisplayName.GeorgeRrMartin,
  [StorytellerAgentWireId.Gilligan]: StorytellerAgentDisplayName.VinceGilligan,
}
