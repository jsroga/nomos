/** Loop orchestrator stream wire values and display labels. */

import { LoopAgentNode } from '@/domains/loop-creator/constants/agent-nodes'
import { LoopCreatorStreamEventType } from '@/shared/data/constants/protocol'
import { LoopChatMessageType } from '@/domains/loop-creator/ui/constants/loop-creator-layout'
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

/**
 * Kept under the old name so call sites did not churn when LangChain went.
 * The values are `ChatMessageRole`'s — see shared/chat/core/message.ts.
 */
export enum LangChainMessageWire {
  GetType = '_getType',
  Ai = 'ai',
  Human = 'human',
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
  ErrorInAgent = 'Error in ',
  ErrorRetrySuffix = ': ',
  ErrorRetryPrompt = '. Please try again.',
}

export const LOOP_ORCHESTRATOR_UNKNOWN_ERROR = API_ERROR.UNKNOWN_ERROR
