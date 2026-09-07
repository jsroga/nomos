import { afterEach, describe, expect, it, vi } from 'vitest'
import { BeatDraftGenerateTimeoutKind } from '../constants/beat-draft-workflow'
import {
  beatDraftGenerateTimeoutMessage,
  raceAuthorGenerate,
} from '../race-author-generate'

const TIMEOUT_MS = 1_000

describe('raceAuthorGenerate', () => {
  afterEach(() => {
    vi.useRealTimers()
  })

  it('returns when generate finishes inside the budget', async () => {
    const script = await raceAuthorGenerate(
      async () => 'INT. HALL — NIGHT',
      TIMEOUT_MS,
      beatDraftGenerateTimeoutMessage(BeatDraftGenerateTimeoutKind.Author, TIMEOUT_MS),
    )
    expect(script).toBe('INT. HALL — NIGHT')
  })

  it('rejects and aborts when generate exceeds the budget', async () => {
    vi.useFakeTimers()
    let signal: AbortSignal | undefined
    const pending = raceAuthorGenerate(
      abortSignal => {
        signal = abortSignal
        return new Promise<string>(() => undefined)
      },
      TIMEOUT_MS,
      beatDraftGenerateTimeoutMessage(BeatDraftGenerateTimeoutKind.Author, TIMEOUT_MS),
    )
    const assertion = expect(pending).rejects.toThrow(
      beatDraftGenerateTimeoutMessage(BeatDraftGenerateTimeoutKind.Author, TIMEOUT_MS),
    )
    await vi.advanceTimersByTimeAsync(TIMEOUT_MS)
    await assertion
    expect(signal?.aborted).toBe(true)
  })
})
