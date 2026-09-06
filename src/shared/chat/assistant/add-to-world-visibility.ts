import { ChatMessageRole } from '@/shared/chat/core/constants/assistant-thread-ui'
import type { CanAddToWorldInput } from './AssistantAddToWorldContext'

/** Hosts must opt in with `canAddToWorld`. `onAddToWorld` alone must not show the button. */
export function addToWorldButtonVisible(input: {
  role: string
  canAddToWorld?: (value: CanAddToWorldInput) => boolean
  toolNames: readonly string[]
  toolArgs: readonly Record<string, unknown>[]
}): boolean {
  if (input.role !== ChatMessageRole.Assistant) return false
  if (!input.canAddToWorld) return false
  return input.canAddToWorld({
    role: input.role,
    toolNames: input.toolNames,
    toolArgs: input.toolArgs,
  })
}
