/**
 * Derive live generation activity from AI SDK UI messages (tools + text).
 * Kept in shared/chat so AssistantChat stays domain-free.
 */

import { getToolName, isToolUIPart } from 'ai'
import type { UIMessage } from 'ai'
import { readString, recordFromJson } from '@/shared/data/json-guards'
import { ChatMessageRole, ChatPartType } from '@/shared/chat/core/utils/assistant-thread-ui'

export enum AssistantGenerationPhase {
  Idle = 'idle',
  Submitted = 'submitted',
  Streaming = 'streaming',
  Tool = 'tool',
  Error = 'error',
}

export enum AssistantGenerationLabel {
  Submitted = 'Waiting for Writers Room…',
  WaitingFirstToken = 'Waiting for first token…',
  SubmittedSlow = 'Still waiting for the model…',
  Thinking = 'Writers Room agent is thinking…',
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

type StreamSignals = {
  lastToolName?: string
  lastToolState?: string
  preview?: string
  lastText: string
  lastReasoning: string
}

function clipPreview(text: string): string {
  return text.length > PREVIEW_MAX ? `${text.slice(0, PREVIEW_MAX)}…` : text
}

function previewFromToolInput(input: unknown): string | undefined {
  const record = recordFromJson(input)
  const worldDescription = readString(record[WORLD_DESCRIPTION_KEY])
  if (!worldDescription) return undefined
  return clipPreview(worldDescription)
}

function latestAssistantParts(messages: UIMessage[]): UIMessage['parts'] | null {
  for (let i = messages.length - 1; i >= 0; i -= 1) {
    const message = messages[i]
    if (message?.role === ChatMessageRole.Assistant) return message.parts
  }
  return null
}

function partText(part: object): string {
  const textValue = Reflect.get(part, ChatPartType.Text)
  return typeof textValue === 'string' ? textValue : ''
}

function collectStreamSignals(parts: UIMessage['parts']): StreamSignals {
  const signals: StreamSignals = { lastText: '', lastReasoning: '' }
  for (const part of parts) {
    if (part.type === ChatPartType.Text) {
      signals.lastText = partText(part)
      continue
    }
    if (part.type === ChatPartType.Reasoning) {
      signals.lastReasoning = partText(part)
      continue
    }
    if (!isToolUIPart(part)) continue
    signals.lastToolName = getToolName(part)
    signals.lastToolState = part.state
    const fromInput = previewFromToolInput(part.input)
    if (fromInput) signals.preview = fromInput
  }
  return signals
}

function toolSuffix(state: string | undefined): {
  suffix: AssistantGenerationLabel
  done: boolean
} {
  const streamingInput = state === ToolUiPartState.InputStreaming
  const done =
    state === ToolUiPartState.OutputAvailable || state === ToolUiPartState.OutputError
  if (streamingInput) return { suffix: AssistantGenerationLabel.ToolStreamingSuffix, done }
  if (done) return { suffix: AssistantGenerationLabel.ToolDoneSuffix, done }
  return { suffix: AssistantGenerationLabel.ToolRunningSuffix, done }
}

export function deriveAssistantGenerationActivity(
  messages: UIMessage[],
  agentId?: string
): AssistantGenerationActivity | null {
  const parts = latestAssistantParts(messages)
  if (parts === null) return null

  if (parts.length === 0) {
    return {
      phase: AssistantGenerationPhase.Submitted,
      label: AssistantGenerationLabel.WaitingFirstToken,
      agentId,
    }
  }

  const signals = collectStreamSignals(parts)
  if (signals.lastToolName) {
    const { suffix, done } = toolSuffix(signals.lastToolState)
    return {
      phase: AssistantGenerationPhase.Tool,
      label: `${AssistantGenerationLabel.ToolPrefix}${signals.lastToolName}${suffix}`,
      toolName: signals.lastToolName,
      preview: signals.preview,
      agentId,
      toolComplete: done,
    }
  }

  if (signals.lastText.trim()) {
    return {
      phase: AssistantGenerationPhase.Streaming,
      label: AssistantGenerationLabel.Streaming,
      preview: clipPreview(signals.lastText),
      agentId,
    }
  }

  if (signals.lastReasoning.trim()) {
    return {
      phase: AssistantGenerationPhase.Streaming,
      label: AssistantGenerationLabel.Thinking,
      preview: clipPreview(signals.lastReasoning),
      agentId,
    }
  }

  return {
    phase: AssistantGenerationPhase.Streaming,
    label: AssistantGenerationLabel.WaitingFirstToken,
    agentId,
  }
}
