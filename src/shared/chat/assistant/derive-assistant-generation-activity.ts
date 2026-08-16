/**
 * Derive live generation activity from AI SDK UI messages (tools + text).
 * Kept in shared/chat so AssistantChat stays domain-free.
 */

import { getToolName, isToolUIPart } from 'ai'
import type { UIMessage } from 'ai'
import { readString, recordFromJson } from '@/shared/data/json-guards'
import { ChatMessageRole, ChatPartType } from '@/shared/chat/core/constants/assistant-thread-ui'

export enum AssistantGenerationPhase {
  Idle = 'idle',
  Submitted = 'submitted',
  Streaming = 'streaming',
  Tool = 'tool',
  Error = 'error',
}

export enum AssistantGenerationLabel {
  Submitted = 'Waiting for Writers Room…',
  SubmittedSlow = 'Still waiting for the model…',
  Streaming = 'Writers Room agent is writing…',
  ToolPrefix = 'Tool · ',
  ToolStreamingSuffix = ' (streaming input)',
  ToolRunningSuffix = ' (running)',
  ToolDoneSuffix = ' (done)',
  Error = 'Generation failed',
  TimedOut = 'Generation timed out — cleared stuck loading',
}

export interface AssistantGenerationActivity {
  phase: AssistantGenerationPhase
  label: string
  toolName?: string
  preview?: string
  error?: string
  agentId?: string
  toolComplete?: boolean
}

const WORLD_DESCRIPTION_KEY = 'worldDescription'
const PREVIEW_MAX = 480

enum ToolUiPartState {
  InputStreaming = 'input-streaming',
  OutputAvailable = 'output-available',
  OutputError = 'output-error',
}

function previewFromToolInput(input: unknown): string | undefined {
  const record = recordFromJson(input)
  const worldDescription = readString(record[WORLD_DESCRIPTION_KEY])
  if (!worldDescription) return undefined
  return worldDescription.length > PREVIEW_MAX
    ? `${worldDescription.slice(0, PREVIEW_MAX)}…`
    : worldDescription
}

function latestAssistantParts(messages: UIMessage[]): UIMessage['parts'] | null {
  for (let i = messages.length - 1; i >= 0; i -= 1) {
    const message = messages[i]
    if (message?.role === ChatMessageRole.Assistant) return message.parts
  }
  return null
}

export function deriveAssistantGenerationActivity(
  messages: UIMessage[],
  agentId?: string
): AssistantGenerationActivity | null {
  const parts = latestAssistantParts(messages)
  if (parts === null) return null

  // Empty assistant parts cover context assembly + model wait; labels name the
  // model wait because assembly is typically sub-second after RAG was removed.
  if (parts.length === 0) {
    return {
      phase: AssistantGenerationPhase.Submitted,
      label: AssistantGenerationLabel.Submitted,
      agentId,
    }
  }

  let lastToolName: string | undefined
  let lastToolState: string | undefined
  let preview: string | undefined
  let lastText = ''

  for (const part of parts) {
    if (part.type === ChatPartType.Text) {
      const textValue = Reflect.get(part, ChatPartType.Text)
      if (typeof textValue === 'string') lastText = textValue
      continue
    }
    if (!isToolUIPart(part)) continue
    lastToolName = getToolName(part)
    lastToolState = part.state
    const fromInput = previewFromToolInput(part.input)
    if (fromInput) preview = fromInput
  }

  if (lastToolName) {
    const streamingInput = lastToolState === ToolUiPartState.InputStreaming
    const done =
      lastToolState === ToolUiPartState.OutputAvailable ||
      lastToolState === ToolUiPartState.OutputError
    const suffix = streamingInput
      ? AssistantGenerationLabel.ToolStreamingSuffix
      : done
        ? AssistantGenerationLabel.ToolDoneSuffix
        : AssistantGenerationLabel.ToolRunningSuffix
    return {
      phase: AssistantGenerationPhase.Tool,
      label: `${AssistantGenerationLabel.ToolPrefix}${lastToolName}${suffix}`,
      toolName: lastToolName,
      preview,
      agentId,
      toolComplete: done,
    }
  }

  if (lastText.trim()) {
    return {
      phase: AssistantGenerationPhase.Streaming,
      label: AssistantGenerationLabel.Streaming,
      preview: lastText.length > PREVIEW_MAX ? `${lastText.slice(0, PREVIEW_MAX)}…` : lastText,
      agentId,
    }
  }

  return {
    phase: AssistantGenerationPhase.Streaming,
    label: AssistantGenerationLabel.Streaming,
    agentId,
  }
}
