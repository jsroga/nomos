import {
  PLANNER_TOOL_ID,
  PlannerAction,
  PlannerTaskStatus,
} from '@/shared/agent-kernel/constants/planner-tool'

export enum CoPilotInteractionType {
  AskUser = 'ASK_USER',
  ProposePlan = 'PROPOSE_PLAN',
  ExecuteStep = 'EXECUTE_STEP',
  Finish = 'FINISH',
}

export enum ExecutiveAgentId {
  Name = 'Executive Agent',
  Id = 'executive-agent',
}

export enum ExecutivePromptKey {
  System = 'executive-agent-system',
  Loop = 'executive-agent-loop',
}

export enum ExecutiveSpanName {
  RunLoop = 'ExecutiveAgent.runLoop',
  ExecuteStep = 'ExecutiveAgent.executeStep',
}

export enum ExecutiveToolChoice {
  Auto = 'auto',
}

export enum ExecutiveJsonField {
  Type = 'type',
}

export const EXECUTIVE_NO_THOUGHT = 'No thought provided.'
export const EXECUTIVE_NO_JSON_ERROR = 'No JSON found parsing response: '
export const EXECUTIVE_INVALID_PAYLOAD = 'Invalid co-pilot interaction payload'
export const EXECUTIVE_RUN_LOOP_FAILED = 'Failed to run agent loop'
export const EXECUTIVE_ERROR_PREFIX = 'Error: '

export const EXECUTIVE_PLANNER_TOOL_ID = PLANNER_TOOL_ID
export const EXECUTIVE_PLANNER_UPDATE_ACTION = PlannerAction.UpdateTaskStatus
export const EXECUTIVE_PLANNER_COMPLETED_STATUS = PlannerTaskStatus.Completed
export const EXECUTIVE_PLANNER_FAILED_STATUS = PlannerTaskStatus.Failed
