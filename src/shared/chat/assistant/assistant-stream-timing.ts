/**
 * Timing/diagnostic tap for the assistant SSE turn, and the guarantee that a
 * turn always renders something.
 *
 * A turn can finish with no text and no tool frames (observed as `count=3`:
 * `start-step`, `finish-step`, `finish`). The thread then shows nothing at all,
 * which reads as a hung chat. The `finish` frame is held back so a notice can be
 * injected ahead of it — appending after `finish` would break frame ordering.
 */

import { generateId } from 'ai'
import type { UIMessageChunk } from 'ai'

enum AssistantTurnLog {
  FirstChunk = '[Stream] First agent chunk after ',
  Toolish = '[Stream] tool-related chunk type=',
  Finish = '[Stream] finish type=',
  StreamDone = '[Stream] agent stream done after ',
  MsSuffix = 'ms count=',
  /** A turn that finishes with no text/tool frames is a model-side empty answer. */
  EmptyTurn = '[Stream] EMPTY TURN — no text or tool frames. finish payload: ',
  Histogram = '[Stream] chunk types: ',
}

enum StreamChunkTypeField {
  Type = 'type',
}

enum StreamChunkTypeFallback {
  Unknown = 'unknown',
}

enum TextChunkType {
  Start = 'text-start',
  Delta = 'text-delta',
  End = 'text-end',
}

const TOOLISH_CHUNK_PREFIX = 'tool-'
const FINISH_CHUNK_TYPE = 'finish'

/**
 * Frames that count as an actual answer.
 *
 * Reasoning is deliberately excluded: a turn that only thinks and then stops
 * still owes the user a result, so it must get the notice even though the
 * thinking was visible on screen.
 */
const ANSWER_CHUNK_PREFIXES = [TextChunkType.Start, TOOLISH_CHUNK_PREFIX]

/** Shown in place of silence when a turn produces no text and no tool calls. */
export const EMPTY_TURN_NOTICE =
  'The model returned an empty response for this turn — nothing was generated. Please try again, or rephrase the request.'

function chunkTypeOf(chunk: unknown): string {
  if (typeof chunk !== 'object' || chunk === null) return typeof chunk
  const type = Reflect.get(chunk, StreamChunkTypeField.Type)
  return typeof type === 'string' ? type : StreamChunkTypeFallback.Unknown
}

export function withStreamTiming(
  source: ReadableStream<UIMessageChunk>,
  startedAt: number
): ReadableStream<UIMessageChunk> {
  let loggedFirst = false
  let count = 0
  let answered = 0
  let finishChunk: UIMessageChunk | undefined
  const seen = new Map<string, number>()

  return source.pipeThrough(
    new TransformStream<UIMessageChunk, UIMessageChunk>({
      transform(chunk, controller) {
        count += 1
        const type = chunkTypeOf(chunk)
        seen.set(type, (seen.get(type) ?? 0) + 1)
        if (ANSWER_CHUNK_PREFIXES.some(prefix => type.startsWith(prefix))) answered += 1
        if (!loggedFirst) {
          loggedFirst = true
          console.log(`${AssistantTurnLog.FirstChunk}${Date.now() - startedAt}ms type=${type}`)
        }
        if (type.startsWith(TOOLISH_CHUNK_PREFIX) || type === FINISH_CHUNK_TYPE) {
          const prefix =
            type === FINISH_CHUNK_TYPE ? AssistantTurnLog.Finish : AssistantTurnLog.Toolish
          console.log(
            `${prefix}${type} @ ${Date.now() - startedAt}${AssistantTurnLog.MsSuffix}${count}`
          )
        }
        if (type === FINISH_CHUNK_TYPE) {
          finishChunk = chunk
          return
        }
        controller.enqueue(chunk)
      },
      flush(controller) {
        const histogram = [...seen.entries()].map(([type, n]) => `${type}×${n}`).join(' ')
        console.log(`${AssistantTurnLog.Histogram}${histogram}`)
        console.log(
          `${AssistantTurnLog.StreamDone}${Date.now() - startedAt}${AssistantTurnLog.MsSuffix}${count}`
        )
        if (answered === 0) {
          console.warn(`${AssistantTurnLog.EmptyTurn}${JSON.stringify(finishChunk)}`)
          const id = generateId()
          controller.enqueue({ type: TextChunkType.Start, id })
          controller.enqueue({ type: TextChunkType.Delta, id, delta: EMPTY_TURN_NOTICE })
          controller.enqueue({ type: TextChunkType.End, id })
        }
        if (finishChunk) controller.enqueue(finishChunk)
      },
    })
  )
}
