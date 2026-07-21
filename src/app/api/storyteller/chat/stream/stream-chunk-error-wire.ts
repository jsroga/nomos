/**
 * SSE error chunk and stream iteration error handlers.
 */

import { getErrorMessage } from '@/shared/errors/error-utils'
import { emitFrame, isRecord, toErrorInfo, type StreamSession } from './stream-session-wire'

/** `chunk.type === 'error'` — emit error + system message + complete, then close. */
export function handleErrorChunk(session: StreamSession, payloadError: unknown): void {
  const { message: errorMessage, code: errorCode } = toErrorInfo(payloadError)

  console.error('[Stream] Error chunk received:', errorMessage)

  emitFrame(session.writer, {
    type: 'error',
    error: {
      message: errorMessage,
      code: errorCode,
    },
  })

  emitFrame(session.writer, {
    type: 'message',
    message: {
      sender: 'System',
      content: `❌ **API Error:** ${errorMessage}`,
      type: 'error',
    },
  })

  emitFrame(session.writer, { type: 'complete' })
  session.writer.close()
}

/** fullStream iterator threw — emit error + message + complete, close. */
export function handleStreamIterationError(session: StreamSession, error: unknown): void {
  // The fullStream iterator threw - extract error details and send to client
  console.error('Stream iteration error:', error)
  const errRecord = isRecord(error) ? error : undefined
  const nestedError = isRecord(errRecord?.error) ? errRecord.error : undefined

  let errorMessage = 'An error occurred while processing your request.'
  let errorCode = 'STREAM_ERROR'

  if (nestedError?.code === 'insufficient_quota') {
    errorMessage =
      '⚠️ OpenAI API quota exceeded. Please check your billing details or try again later.'
    errorCode = 'QUOTA_EXCEEDED'
  } else if (typeof nestedError?.message === 'string') {
    errorMessage = nestedError.message
    errorCode = typeof nestedError.code === 'string' ? nestedError.code : 'API_ERROR'
  } else if (errRecord?.message) {
    errorMessage = getErrorMessage(error)
  }

  // Send error event to client
  emitFrame(session.writer, {
    type: 'error',
    error: {
      message: errorMessage,
      code: errorCode,
      details: process.env.NODE_ENV === 'development' ? String(error) : undefined,
    },
  })

  // Also send as a message so it's visible in chat
  emitFrame(session.writer, {
    type: 'message',
    message: {
      sender: 'System',
      content: `❌ **Error:** ${errorMessage}`,
      type: 'error',
    },
  })

  emitFrame(session.writer, { type: 'complete' })
  session.writer.close()
}
