/**
 * SPEC-12's burn-down meter.
 *
 * Asserted as a ratchet, never as equality: an exact count fails on any
 * unrelated commit that happens to move it, and a test that fails for reasons
 * unrelated to its subject gets deleted within a month. `.quality-ratchet.json`
 * holds the number, and its contract is that counters may only decrease.
 */
import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
// The .mjs harness is shared by SPEC-12/13/14/16 and carries no types by design.
import { inventory } from '../inventory/index.mjs'
import { ProcessEnvBucket, classifyProcessEnvRead } from '../inventory/matchers.mjs'

const RATCHET = JSON.parse(readFileSync('.quality-ratchet.json', 'utf8'))

/** Files SPEC-13 Task 13 dissolves; migrating them here would be wasted work. */
const MODEL_CONFIG_FILES = [
  'agent-kernel/models.ts',
  'agent-kernel/model-settings.ts',
  'constants/llm-providers.ts',
  'model-config.ts',
]

function serverReads(): string[] {
  const result = inventory((line: string, file: string) =>
    classifyProcessEnvRead(line, file) === ProcessEnvBucket.Server ? ProcessEnvBucket.Server : null
  )
  return result.identitiesByBucket[ProcessEnvBucket.Server] ?? []
}

describe('process.env reads', () => {
  it('does not grow the count SPEC-12 is burning down', () => {
    const owned = serverReads().filter(
      file => !MODEL_CONFIG_FILES.some(deferred => file.includes(deferred))
    )

    expect(owned.length).toBeLessThanOrEqual(RATCHET.bareProcessEnvReads)
  })

  it('leaves the model-config files to SPEC-13, and says how many that is', () => {
    const deferred = serverReads().filter(file =>
      MODEL_CONFIG_FILES.some(candidate => file.includes(candidate))
    )

    expect(deferred.length).toBeLessThanOrEqual(RATCHET.processEnvReadsInModelConfig)
  })
})
