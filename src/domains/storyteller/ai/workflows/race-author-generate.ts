import '@/shared/data/server-guard'
import { BeatDraftGenerateTimeoutKind } from './constants/beat-draft-workflow'

/**
 * Cap a Mastra author generate() so a thinking model cannot hang the beat-draft
 * HTTP turn. Abort the in-flight call when the budget expires.
 */

export function beatDraftGenerateTimeoutMessage(
  kind: BeatDraftGenerateTimeoutKind,
  timeoutMs: number,
): string {
  return `${kind} timed out after ${timeoutMs}ms`
}

export async function raceAuthorGenerate<T>(
  run: (abortSignal: AbortSignal) => Promise<T>,
  timeoutMs: number,
  timedOutMessage: string,
): Promise<T> {
  const controller = new AbortController()
  let timer: ReturnType<typeof setTimeout> | undefined
  try {
    return await new Promise<T>((resolve, reject) => {
      timer = setTimeout(() => {
        controller.abort()
        reject(new Error(timedOutMessage))
      }, timeoutMs)
      void settleRun(run, controller.signal, resolve, reject)
    })
  } finally {
    if (timer !== undefined) clearTimeout(timer)
  }
}

async function settleRun<T>(
  run: (abortSignal: AbortSignal) => Promise<T>,
  abortSignal: AbortSignal,
  resolve: (value: T) => void,
  reject: (error: unknown) => void,
): Promise<void> {
  try {
    resolve(await run(abortSignal))
  } catch (error) {
    if (abortSignal.aborted) return
    reject(error)
  }
}