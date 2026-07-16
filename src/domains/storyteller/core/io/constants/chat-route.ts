/** Storyteller non-streaming chat route wire constants. */

export enum ChatPipelineRunStatus {
  Success = 'success',
}

export enum ChatResponseStatus {
  Completed = 'completed',
  NeedsReview = 'needs_review',
  Failed = 'failed',
}

export enum ChatContinuitySeverity {
  Info = 'info',
}

export enum ChatSenderName {
  Storyteller = 'Storyteller',
}
