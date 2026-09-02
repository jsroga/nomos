/**
 * SSE stream finalization — auto-link final text, emit message + queued actions.
 */

import { emitFrame, type StreamSession } from './stream-session-wire'
import { recordStreamedCall } from './stream-usage-wire'

/** Auto-link the final text, emit message + queued actions + complete, close. */
export async function finalizeStream(session: StreamSession): Promise<void> {
  // Before anything else: the stream is over and whatever it cost is known now.
  // An abandoned stream still spent money, so this runs on every exit.
  await recordStreamedCall(session)

  // Auto-link entity names in generated text before sending
  let finalText = session.fullText
  const scope = session.scope
  if (scope && session.fullText.length > 0) {
    try {
      const { entityAutoLinker } = await import(
        '@/domains/storyteller/services/entity-auto-linker-service'
      )
      finalText = await entityAutoLinker.autoLink(session.fullText, scope)
    } catch (err) {
      console.warn('[Stream] Entity auto-linking failed:', err)
      // Continue with original text
    }
  }

  // Send final message with auto-linked entities
  emitFrame(session.writer, {
    type: 'message',
    message: {
      sender: 'Storyteller',
      content: finalText,
      type: 'ai',
    },
  })

  // NOW emit any collected actions (appears after final message for better UX)
  for (const action of session.pendingActions) {
    emitFrame(session.writer, {
      type: 'action',
      action,
    })
    console.log(`[Stream] Emitted action at end: ${action.type}`)
  }

  // Send complete event
  emitFrame(session.writer, { type: 'complete' })

  session.writer.close()
}
