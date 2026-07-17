import { TargetAudience } from './logic-tool-wire'

export enum GameLoopWorkflowStepId {
  Ideation = 'ideation',
  BalanceCheck = 'balance_check',
  StructureValidation = 'structure_validation',
  HumanReview = 'human_review',
  Refinement = 'refinement',
  Finalization = 'finalization',
}

export enum GameLoopWorkflowStatus {
  Completed = 'completed',
  NeedsReview = 'needs_review',
  Failed = 'failed',
}

export enum GameLoopWorkflowRunStatus {
  Failed = 'failed',
  Suspended = 'suspended',
  Success = 'success',
}

export enum GameLoopTypeInput {
  Core = 'core',
  Meta = 'meta',
  Social = 'social',
  Monetization = 'monetization',
}

export enum GameLoopValidationState {
  Draft = 'draft',
}

export enum GameLoopWorkflowCopy {
  Description = 'Design, validate, review, and persist a game loop.',
  NoMechanicsToAnalyze = 'No mechanics to analyze - skipping balance check',
  MechanicsSchemaFailed = 'Mechanics failed schema validation for balance analysis',
  BalanceInvalidPayload = 'Balance analysis returned an invalid payload',
  NoLoopStructure = 'No loop structure to validate',
  LoopMechanicsSchemaFailed = 'Loop proposal mechanics failed schema validation',
  StructureValidationFailed = 'Structure validation failed',
  AwaitingHumanReview = 'Awaiting human review of loop proposal',
  NoValidLoopStructure = 'No valid loop structure generated',
  WorkflowSuspended = 'Workflow suspended for human review',
  UntitledLoop = 'Untitled Loop',
  Untitled = 'Untitled',
  SystemUserId = 'system',
}

export enum BalanceIssueSeverity {
  Critical = 'critical',
}

export const DEFAULT_TARGET_AUDIENCE = TargetAudience.Midcore
export const DEFAULT_LOOP_TYPE = GameLoopTypeInput.Core
export const DEFAULT_SESSION_DURATION_MINUTES = 30
