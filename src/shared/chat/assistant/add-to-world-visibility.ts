import { ChatMessageRole } from '@/shared/chat/core/constants/assistant-thread-ui'
import type { CanAddToWorldInput } from './AssistantAddToWorldContext'

export enum AddToWorldFailureMarker {
  FailedMidRun = 'failed mid-run',
  NoDraftToReview = 'no draft to review',
  WantMeToRetry = 'want me to retry',
  PipelineFailed = 'pipeline failed',
}

/** Assistant wrap-up after a failed run — nothing to commit to the world. */
export function isAddToWorldFailureReply(text: string | undefined): boolean {
  if (!text) return false
  const lower = text.toLowerCase()
  return (
    lower.includes(AddToWorldFailureMarker.FailedMidRun) ||
    lower.includes(AddToWorldFailureMarker.NoDraftToReview) ||
    lower.includes(AddToWorldFailureMarker.WantMeToRetry) ||
    lower.includes(AddToWorldFailureMarker.PipelineFailed)
  )
}

/** Hosts must opt in with `canAddToWorld`. `onAddToWorld` alone must not show the button. */
export function addToWorldButtonVisible(input: {
  role: string
  canAddToWorld?: (value: CanAddToWorldInput) => boolean
  toolNames: readonly string[]
  toolArgs: readonly Record<string, unknown>[]
  text?: string
  toolsFailed?: boolean
}): boolean {
  if (input.role !== ChatMessageRole.Assistant) return false
  if (input.toolsFailed) return false
  if (isAddToWorldFailureReply(input.text)) return false
  if (!input.canAddToWorld) return false
  return input.canAddToWorld({
    role: input.role,
    toolNames: input.toolNames,
    toolArgs: input.toolArgs,
  })
}
