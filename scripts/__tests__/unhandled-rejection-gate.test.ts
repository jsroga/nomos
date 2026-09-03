/**
 * `dangerouslyIgnoreUnhandledErrors: false` must actually fail the suite.
 *
 * The probe file is excluded from the default include so `npm run test:unit`
 * does not fail on the intentional leak. This parent spawns it and asserts
 * a non-zero exit.
 */

import { spawnSync } from 'node:child_process'
import path from 'node:path'
import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const REPO_ROOT = path.resolve(__dirname, '../..')
const FIXTURE = 'scripts/gate-fixtures/unhandled-rejection.test.ts'
const UNIT_CONFIG = 'vitest.config.ts'
const LIVE_CONFIG = 'vitest.live.config.ts'
const FLAG = 'dangerouslyIgnoreUnhandledErrors: false'

function configSource(file: string): string {
  return readFileSync(path.join(REPO_ROOT, file), 'utf8')
}

describe('unhandled rejection gate', () => {
  it('keeps the ignore flag off in both vitest configs', () => {
    expect(configSource(UNIT_CONFIG)).toContain(FLAG)
    expect(configSource(LIVE_CONFIG)).toContain(FLAG)
    expect(configSource(UNIT_CONFIG)).not.toContain('dangerouslyIgnoreUnhandledErrors: true')
    expect(configSource(LIVE_CONFIG)).not.toContain('dangerouslyIgnoreUnhandledErrors: true')
  })

  it('fails vitest when a test leaks a rejection', () => {
    const result = spawnSync(
      'npx',
      ['vitest', 'run', FIXTURE, '--config', UNIT_CONFIG],
      {
        cwd: REPO_ROOT,
        encoding: 'utf8',
        env: { ...process.env },
      },
    )
    expect(result.status).not.toBe(0)
  }, 30_000)
})
