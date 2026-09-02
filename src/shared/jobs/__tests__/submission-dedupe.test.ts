/**
 * The pilot's end-to-end claim, from click to idempotency key.
 *
 * What a unit test cannot reach: that Trigger itself collapses two triggers
 * sharing a key into one run, and that two different keys produce two different
 * images. Both need a live provider — `npm run test:live` covers the second via
 * `2d-canvas/tasks/smokes/generate-tile-providers.tests.ts`. What is pinned
 * here is the half we own: the same intent yields one key, a re-roll yields two.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest'

const triggerMock = vi.fn()

vi.mock('@trigger.dev/sdk', () => ({
  runs: { retrieve: vi.fn(), cancel: vi.fn() },
  tasks: { trigger: (...args: unknown[]) => triggerMock(...args) },
}))

import { TRIGGER_TASK_ID } from '@/shared/data/constants/api-errors'
import { triggerOwnedRun } from '../owned-run'
import { withSubmissionNonce } from '../submission-nonce'

const PROJECT = '22222222-2222-4222-8222-222222222222'
const INTENT = `${TRIGGER_TASK_ID.GENERATE_TILE}:${PROJECT}:3,4`
const PROMPT = 'a walled garden at dusk'

/** Stands in for the route: nonce in, trigger out. */
function submitTile(requestId: string) {
  return triggerOwnedRun(TRIGGER_TASK_ID.GENERATE_TILE, {
    projectId: PROJECT,
    requestId,
    x: 3,
    y: 4,
    prompt: PROMPT,
  })
}

function keys(): string[] {
  return triggerMock.mock.calls.map(call => call[2].idempotencyKey)
}

beforeEach(() => {
  triggerMock.mockReset()
  triggerMock.mockResolvedValue({ id: 'run_1' })
})

describe('a double-click on Generate', () => {
  it('sends one key, so the second click does not buy a second image', async () => {
    let release = () => {}
    const held = new Promise<void>(resolve => {
      release = resolve
    })
    const click = () =>
      withSubmissionNonce(INTENT, async requestId => {
        await submitTile(requestId)
        await held
      })

    const first = click()
    const second = click()
    release()
    await Promise.all([first, second])

    const [firstKey, secondKey] = keys()
    expect(firstKey).toBe(secondKey)
  })
})

describe('a deliberate re-roll of the same prompt', () => {
  it('sends a new key, so it buys a second image', async () => {
    await withSubmissionNonce(INTENT, submitTile)
    await withSubmissionNonce(INTENT, submitTile)

    const [firstKey, secondKey] = keys()
    expect(firstKey).not.toBe(secondKey)
  })
})
