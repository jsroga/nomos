/** AgentLog display maps, delegation heuristics, and UI constants. */

import { ChatMessageRole, ChatMessageSender, ChatSenderAlias } from '../../core/constants/chat-messages'
import { ActivityLogEntryType } from '../../core/constants/chat-messages'
import { AgentStatusKind } from './agent-status'

export enum AgentWireId {
  Showrunner = 'Showrunner',
  PlotArchitect = 'PlotArchitect',
  CharacterPsychology = 'CharacterPsychology',
  ConsequenceTracker = 'ConsequenceTracker',
  DevilsAdvocate = 'DevilsAdvocate',
  VisualMoment = 'VisualMoment',
  Writer = 'Writer',
  User = 'User',
  Supervisor = 'Supervisor',
  supervisor = 'supervisor',
  RunnableSequence = 'RunnableSequence',
  DelegateToPremiseArchitect = 'delegate_to_premise_architect',
  DelegateToPremiseArchitectUpper = 'DELEGATE_TO_PREMISE_ARCHITECT',
  PremiseArchitect = 'premiseArchitect',
  PremiseArchitectPascal = 'PremiseArchitect',
  PremiseArchitectUpper = 'PREMISEARCHITECT',
  DelegateToPlotArchitect = 'delegate_to_plot_architect',
  DelegateToCharacterPsychology = 'delegate_to_character_psychology',
  DelegateToWorldSimulator = 'delegate_to_world_simulator',
  DelegateToMagicAgent = 'delegate_to_magic_agent',
  WorldSimulator = 'WorldSimulator',
  MagicAgent = 'MagicAgent',
  EpisodePremiseArchitect = 'EpisodePremiseArchitect',
  episodePremiseArchitect = 'episodePremiseArchitect',
  ScriptEditor = 'ScriptEditor',
}

export enum AgentDisplayName {
  Showrunner = 'Showrunner',
  PlotArchitect = 'Plot Architect',
  CharacterExpert = 'Character Expert',
  StoryTracker = 'Story Tracker',
  DevilsAdvocate = "Devil's Advocate",
  VisualDesigner = 'Visual Designer',
  Writer = 'Writer',
  You = 'You',
  Processing = 'Processing',
  PremiseArchitect = 'Premise Architect',
  WorldSimulator = 'World Simulator',
  CreativeSpark = 'Creative Spark',
  ScriptEditor = 'Script Editor',
}

export const AGENT_DISPLAY_NAMES: Record<string, string> = {
  [AgentWireId.Showrunner]: AgentDisplayName.Showrunner,
  [AgentWireId.PlotArchitect]: AgentDisplayName.PlotArchitect,
  [AgentWireId.CharacterPsychology]: AgentDisplayName.CharacterExpert,
  [AgentWireId.ConsequenceTracker]: AgentDisplayName.StoryTracker,
  [AgentWireId.DevilsAdvocate]: AgentDisplayName.DevilsAdvocate,
  [AgentWireId.VisualMoment]: AgentDisplayName.VisualDesigner,
  [AgentWireId.Writer]: AgentDisplayName.Writer,
  [AgentWireId.User]: AgentDisplayName.You,
  [AgentWireId.Supervisor]: AgentDisplayName.Showrunner,
  [AgentWireId.supervisor]: AgentDisplayName.Showrunner,
  [AgentWireId.RunnableSequence]: AgentDisplayName.Processing,
  [AgentWireId.DelegateToPremiseArchitect]: AgentDisplayName.PremiseArchitect,
  [AgentWireId.DelegateToPremiseArchitectUpper]: AgentDisplayName.PremiseArchitect,
  [AgentWireId.PremiseArchitect]: AgentDisplayName.PremiseArchitect,
  [AgentWireId.PremiseArchitectPascal]: AgentDisplayName.PremiseArchitect,
  [AgentWireId.PremiseArchitectUpper]: AgentDisplayName.PremiseArchitect,
  [AgentWireId.DelegateToPlotArchitect]: AgentDisplayName.PlotArchitect,
  [AgentWireId.DelegateToCharacterPsychology]: AgentDisplayName.CharacterExpert,
  [AgentWireId.DelegateToWorldSimulator]: AgentDisplayName.WorldSimulator,
  [AgentWireId.DelegateToMagicAgent]: AgentDisplayName.CreativeSpark,
  [AgentWireId.WorldSimulator]: AgentDisplayName.WorldSimulator,
  [AgentWireId.MagicAgent]: AgentDisplayName.CreativeSpark,
  [AgentWireId.EpisodePremiseArchitect]: AgentDisplayName.PremiseArchitect,
  [AgentWireId.episodePremiseArchitect]: AgentDisplayName.PremiseArchitect,
  [AgentWireId.ScriptEditor]: AgentDisplayName.ScriptEditor,
}

export const AGENT_NAME_CAMEL_CASE_SPLIT = ' $1'
export const AGENT_NAME_UNDERSCORE_REPLACEMENT = '_'
export const AGENT_NAME_DELEGATE_PREFIX_PATTERN = /delegate to /i

export enum DelegationPhrase {
  DelegatingTo = 'delegating to',
  DelegatedTask = 'delegated task',
  DelegateToPrefix = 'delegate_to_',
  Delegate = 'delegate',
}

export const DELEGATION_HANDOFF_PREFIX = 'Delegating to'
export const DELEGATION_ELLIPSIS_SUFFIX = '...'

export enum MessageGroupType {
  Message = 'message',
  Delegation = 'delegation',
}

export enum AgentLogTimeFormat {
  TwoDigit = '2-digit',
}

export enum StatusContentKeyword {
  Thinking = 'thinking',
  Processing = 'processing',
}

export const USING_TOOL_STATUS_PATTERN = /^Using (.+?)\.\.\.$/

export const AGENT_LOG_DEFAULT_COLOR = 'text-muted-foreground'
export const AGENT_LOG_SCROLL_BEHAVIOR = 'smooth'
export const AGENT_LOG_COPY_FAILED = 'Failed to copy:'
export const AGENT_LOG_FALLBACK_AGENT = ChatMessageSender.Unknown

export { ChatMessageRole, ChatSenderAlias, ActivityLogEntryType, AgentStatusKind }
