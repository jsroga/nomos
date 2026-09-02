import { describe, expect, it } from 'vitest'
import { readSubmissionNonce, withSubmissionNonce } from '../submission-nonce'

const INTENT = 'generate-tile:project-1:3,4'

describe('withSubmissionNonce', () => {
  it('gives two rapid clicks the same nonce, so they collapse into one run', async () => {
    const seen: string[] = []
    let release = () => {}
    const held = new Promise<void>(resolve => {
      release = resolve
    })
    const submit = async (requestId: string) => {
      seen.push(requestId)
      await held
    }

    const first = withSubmissionNonce(INTENT, submit)
    const second = withSubmissionNonce(INTENT, submit)
    release()
    await Promise.all([first, second])

    expect(seen).toHaveLength(2)
    expect(seen[0]).toBe(seen[1])
  })

  it('gives a deliberate re-roll a new nonce, so it is a second run', async () => {
    const seen: string[] = []
    const submit = async (requestId: string) => {
      seen.push(requestId)
    }

    await withSubmissionNonce(INTENT, submit)
    await withSubmissionNonce(INTENT, submit)

    expect(seen[0]).not.toBe(seen[1])
  })

  it('does not share a nonce between two different targets', async () => {
    const seen: string[] = []
    let release = () => {}
    const held = new Promise<void>(resolve => {
      release = resolve
    })
    const submit = async (requestId: string) => {
      seen.push(requestId)
      await held
    }

    const first = withSubmissionNonce(INTENT, submit)
    const second = withSubmissionNonce('generate-tile:project-1:9,9', submit)
    release()
    await Promise.all([first, second])

    expect(seen[0]).not.toBe(seen[1])
  })

  it('frees the nonce when the submission fails, so a retry is a new run', async () => {
    const seen: string[] = []
    const failing = async (requestId: string) => {
      seen.push(requestId)
      throw new Error('network')
    }

    await expect(withSubmissionNonce(INTENT, failing)).rejects.toThrow()
    await expect(withSubmissionNonce(INTENT, failing)).rejects.toThrow()

    expect(seen[0]).not.toBe(seen[1])
  })
})

describe('readSubmissionNonce', () => {
  it('reads the nonce a request carries', () => {
    expect(readSubmissionNonce({ requestId: 'abc' })).toBe('abc')
  })

  it('returns null rather than guessing, so the route can answer 400', () => {
    expect(readSubmissionNonce({})).toBeNull()
    expect(readSubmissionNonce(null)).toBeNull()
    expect(readSubmissionNonce({ requestId: 42 })).toBeNull()
  })
})
