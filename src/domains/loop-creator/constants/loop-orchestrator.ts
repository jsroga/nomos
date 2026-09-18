/** Loop orchestrator stream wire values and display labels. */

import { LoopAgentNode } from '@/domains/loop-creator/constants/agent-nodes'
import { LoopCreatorStreamEventType } from '@/shared/data/constants/protocol'
import { LoopChatMessageType } from '@/domains/loop-creator/ui/utils/loop-creator-layout'
import { API_ERROR } from '@/shared/data/constants/api-errors'

export { LoopCreatorStreamEventType as LoopOrchestratorEventType }
export { LoopChatMessageType as LoopOrchestratorMessageType }

export enum LoopAgentDisplayName {
  Supervisor = 'Showrunner',
  LoopPlanner = 'Loop Planner',
  MechanicsDesigner = 'Mechanics Designer',
  BalanceAnalyst = 'Balance Analyst',
  ProgressionArchitect = 'Progression Architect',
  MarketAnalyst = 'Market Analyst',
}

export const LOOP_AGENT_DISPLAY_NAMES: Record<LoopAgentNode, LoopAgentDisplayName> = {
  [LoopAgentNode.Supervisor]: LoopAgentDisplayName.Supervisor,
  [LoopAgentNode.LoopPlanner]: LoopAgentDisplayName.LoopPlanner,
  [LoopAgentNode.MechanicsDesigner]: LoopAgentDisplayName.MechanicsDesigner,
  [LoopAgentNode.BalanceAnalyst]: LoopAgentDisplayName.BalanceAnalyst,
  [LoopAgentNode.ProgressionArchitect]: LoopAgentDisplayName.ProgressionArchitect,
  [LoopAgentNode.MarketAnalyst]: LoopAgentDisplayName.MarketAnalyst,
}

export enum LoopOrchestratorNodeStatus {
  Working = 'working',
  Done = 'done',
}

export enum LoopCreatorTraceName {
  Crew = 'loop-creator.crew',
  MarketAnalystCompletion = 'loop-creator.completion.market-analyst',
}

export enum LoopAgentWorkingCopy {
  Supervisor = 'Showrunner is routing the crew…',
  LoopPlanner = 'Loop Planner is designing core loops…',
  MechanicsDesigner = 'Mechanics Designer is designing core loops and mechanics…',
  BalanceAnalyst = 'Balance Analyst is reviewing effort and reward…',
  ProgressionArchitect = 'Progression Architect is designing pacing…',
  MarketAnalyst = 'Market Analyst is researching the audience…',
}

export const LOOP_AGENT_WORKING_COPY: Record<LoopAgentNode, LoopAgentWorkingCopy> = {
  [LoopAgentNode.Supervisor]: LoopAgentWorkingCopy.Supervisor,
  [LoopAgentNode.LoopPlanner]: LoopAgentWorkingCopy.LoopPlanner,
  [LoopAgentNode.MechanicsDesigner]: LoopAgentWorkingCopy.MechanicsDesigner,
  [LoopAgentNode.BalanceAnalyst]: LoopAgentWorkingCopy.BalanceAnalyst,
  [LoopAgentNode.ProgressionArchitect]: LoopAgentWorkingCopy.ProgressionArchitect,
  [LoopAgentNode.MarketAnalyst]: LoopAgentWorkingCopy.MarketAnalyst,
}

export enum LoopOrchestratorLog {
  Invoking = '[LoopOrchestrator] Invoking ',
  Completed = '[LoopOrchestrator] ',
  CompletedSuffix = ' completed in ',
  CompletedMsSuffix = 'ms',
  AgentFailed = '[LoopOrchestrator] Agent ',
  AgentFailedSuffix = ' failed:',
  UnknownNextAgent = '[LoopOrchestrator] Unknown nextAgent: ',
  StartingRun = '[LoopOrchestrator] Starting run...',
  CallingLlmSuffix = ' Calling LLM...',
  ErrorInAgent = 'Error in ',
  ErrorRetrySuffix = ': ',
  ErrorRetryPrompt = '. Please try again.',
}

export const LOOP_CREATOR_ROUTE_MAX_DURATION_SEC = 300

export const LOOP_ORCHESTRATOR_UNKNOWN_ERROR = API_ERROR.UNKNOWN_ERROR
