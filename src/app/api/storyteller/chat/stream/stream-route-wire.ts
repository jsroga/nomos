/**
 * Storyteller chat stream route wire — HTTP/SSE headers, Mastra chunk types,
 * route error copy, log prefixes, and thin frame emitters shared by the legacy
 * agent path, controller path, and autonomous stream.
 */

import { ChatFrameType } from '@/shared/chat/core/protocol'
import type { DetectedSection } from '@/domains/storyteller/config/tool-result-mapper'
import { ApiErrorMessage, HttpHeader, SseHeader } from '@/shared/data/constants/protocol-http'
import { emitFrame, type SseWriter } from './stream-wire'

export const STORYTELLER_AGENTIC_MODE_INSTRUCTION =
  '\n### AGENTIC MODE\nFor any request to write, draft, or generate a story beat or scene, call \'run_beat_draft_workflow\' rather than drafting in chat.\n'

export enum MastraStreamChunkType {
  /** Carries `usage`, which is how a streamed call gets costed. */
  Finish = 'finish',
  StepFinish = 'step-finish',
  Error = 'error',
  TextDelta = 'text-delta',
  ReasoningDelta = 'reasoning-delta',
  ToolCall = 'tool-call',
  ToolResult = 'tool-result',
  StepStart = 'step-start',
}

export const MASTRA_CHUNK = {
  error: MastraStreamChunkType.Error,
  textDelta: MastraStreamChunkType.TextDelta,
  reasoningDelta: MastraStreamChunkType.ReasoningDelta,
  toolCall: MastraStreamChunkType.ToolCall,
  toolResult: MastraStreamChunkType.ToolResult,
  stepStart: MastraStreamChunkType.StepStart,
  finish: MastraStreamChunkType.Finish,
  stepFinish: MastraStreamChunkType.StepFinish,
} as const

export enum StorytellerStreamAgentName {
  Storyteller = 'Storyteller',
}

export enum StorytellerStreamAgentStatus {
  Thinking = 'thinking',
}

export enum StorytellerStreamStepMessage {
  Processing = 'Step: Processing',
}

export enum StorytellerStreamErrorMessage {
  StreamFailed = 'Stream failed',
  InvalidMessage = 'Invalid message parameter',
  MessageTooLong = 'Message too long (max 10000 characters)',
  StreamingFailed = 'Streaming failed',
}

export enum StorytellerStreamLogPrefix {
  StreamProcessingError = 'Stream processing error:',
  ContextAssemblyError = '[Stream] Context assembly error:',
  EnqueueFailed = '[Stream] Enqueue failed, stream likely closed',
  CloseFailed = '[Stream] Close failed, already closed',
  ChunkError = 'Stream chunk error:',
  StreamingError = 'Streaming error:',
}

export enum StorytellerStreamErrorCategory {
  System = 'SYSTEM',
}

export enum StorytellerStreamToolChoice {
  Auto = 'auto',
}

export const STREAM_ROUTE_TEXT = {
  traceIdHeader: HttpHeader.TRACE_ID,
  toolChoiceAuto: StorytellerStreamToolChoice.Auto,
  contentTypeJson: 'application/json',
  contentTypeEventStream: SseHeader.ContentType,
  cacheControlNoCache: SseHeader.CacheControl,
  connectionKeepAlive: SseHeader.Connection,
  errUnauthorized: ApiErrorMessage.UNAUTHORIZED,
  errInvalidMessage: StorytellerStreamErrorMessage.InvalidMessage,
  errMessageTooLong: StorytellerStreamErrorMessage.MessageTooLong,
  errProjectAccess: ApiErrorMessage.PROJECT_NOT_FOUND,
  errEpisodeAccess: ApiErrorMessage.EPISODE_NOT_FOUND,
  errStreamingFailed: StorytellerStreamErrorMessage.StreamingFailed,
  logContextAssemblyError: StorytellerStreamLogPrefix.ContextAssemblyError,
  logEnqueueFailed: StorytellerStreamLogPrefix.EnqueueFailed,
  logCloseFailed: StorytellerStreamLogPrefix.CloseFailed,
  logChunkError: StorytellerStreamLogPrefix.ChunkError,
  logStreamingError: StorytellerStreamLogPrefix.StreamingError,
  errorCategorySystem: StorytellerStreamErrorCategory.System,
  agentStoryteller: StorytellerStreamAgentName.Storyteller,
} as const

/** `{ type: 'start', traceId }` */
export function emitStartFrame(writer: SseWriter, traceId: string): void {
  emitFrame(writer, { type: ChatFrameType.Start, traceId })
}

/** `{ type: 'token', token }` */
export function emitTokenFrame(writer: SseWriter, token: string): void {
  emitFrame(writer, { type: ChatFrameType.Token, token })
}

/** `{ type: 'thinking', thinking, agent: 'Storyteller' }` */
export function emitThinkingFrame(writer: SseWriter, thinking: string): void {
  emitFrame(writer, {
    type: ChatFrameType.Thinking,
    thinking,
    agent: StorytellerStreamAgentName.Storyteller,
  })
}

/** Section shimmer start frame with the `Generating <section>...` message. */
export function emitSectionLoadingStart(writer: SseWriter, section: DetectedSection): void {
  emitFrame(writer, {
    type: ChatFrameType.SectionLoading,
    section,
    loading: true,
    message: `Generating ${section}...`,
  })
  console.log(`[Stream] Emitted section_loading: ${section} = true`)
}

/** step-start frame — has always rendered as 'Step: Processing'; byte-identical. */
export function emitStepStatusFrame(writer: SseWriter): void {
  emitFrame(writer, {
    type: ChatFrameType.AgentStatus,
    agent: StorytellerStreamAgentName.Storyteller,
    status: StorytellerStreamAgentStatus.Thinking,
    message: StorytellerStreamStepMessage.Processing,
  })
}

/** Outer-catch fatal error frame (`{ type: 'error', message }`), then close. */
export function emitFatalStreamError(writer: SseWriter, error: unknown): void {
  console.error(StorytellerStreamLogPrefix.StreamProcessingError, error)
  emitFrame(writer, {
    type: ChatFrameType.Error,
    message: error instanceof Error ? error.message : StorytellerStreamErrorMessage.StreamFailed,
  })
  writer.close()
}
