/**
 * SSE wire module for the storyteller chat stream route: frame vocabulary
 * (enum) + Mastra chunk handlers + session state. Thin route constants and
 * shared frame emitters live in `stream-route-wire.ts`; controller event mapping
 * lives in `domains/storyteller/ai/controller/controller-sse-wire.ts`.
 *
 * Every emitted frame is BYTE-IDENTICAL to the previous inline code. The SSE
 * wire contract is frozen; change shapes only with the sse-wire-contract skill.
 *
 * PLAN-V2 3.2 relocates `ChatStreamFrameType` to `shared/chat/core/protocol.ts`
 * so route and useChatStream import the same contract.
 */

export {
  ChatStreamFrameType,
  emitFrame,
  isRecord,
  toErrorInfo,
  type SseWriter,
  type StreamSession,
} from './stream-session-wire'

export { handleErrorChunk, handleStreamIterationError } from './stream-chunk-error-wire'

export { handleToolCallChunk } from './stream-chunk-tool-call-wire'

export { handleToolResultChunk } from './stream-chunk-tool-result-wire'

export { finalizeStream } from './stream-finalize-wire'
