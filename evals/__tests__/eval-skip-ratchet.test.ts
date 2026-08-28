/**
 * The one exemption this spec creates, and the thing that makes it reviewable.
 *
 * `Eval-Skip:` is a commit trailer rather than an env var on purpose: an env
 * var gets exported in a shell profile and is never seen again, while a trailer
 * is in the history and countable. It may only decrease per the ratchet's
 * contract — a growing count means the gate is being routed around.
 */
import { execFileSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const RATCHET = JSON.parse(readFileSync('.quality-ratchet.json', 'utf8'))
const SKIP_TRAILER = '^Eval-Skip:'

function skipCommits(): number {
  const output = execFileSync('git', ['log', `--grep=${SKIP_TRAILER}`, '--oneline'], {
    encoding: 'utf8',
  })
  return output.split('\n').filter(Boolean).length
}

describe('eval skips', () => {
  it('does not grow the count of prompt changes shipped without evals', () => {
    expect(skipCommits()).toBeLessThanOrEqual(RATCHET.evalSkipCommits)
  })
})
