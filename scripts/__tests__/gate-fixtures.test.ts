import { execFileSync } from 'node:child_process'
import { describe, expect, it } from 'vitest'

/**
 * Guard the guards.
 *
 * A disabled gate looks exactly like a passing gate — this repo lost its barrel
 * guard that way, silently, for an unknown length of time. Every structural rule
 * therefore ships a fixture that must fail, and this test asserts it still does.
 */
const FIXTURES = [
  {
    file: 'scripts/gate-fixtures/runs-retrieve-outside-platform.ts',
    ruleId: 'local/trigger-runs-ownership',
    minimumErrors: 2,
  },
]

interface EslintMessage {
  ruleId: string | null
  severity: number
}
interface EslintResult {
  messages: EslintMessage[]
}

/** execFile errors carry the captured stdout; narrow instead of asserting. */
function readExecStdout(error: unknown): string | undefined {
  if (typeof error !== 'object' || error === null || !('stdout' in error)) return undefined
  const { stdout } = error
  return typeof stdout === 'string' ? stdout : undefined
}

function lint(file: string): EslintResult[] {
  try {
    const stdout = execFileSync(
      'npx',
      ['eslint', '--no-ignore', '--format', 'json', file],
      { encoding: 'utf8' }
    )
    return JSON.parse(stdout)
  } catch (error) {
    // ESLint exits non-zero when it reports errors, which is the expected path.
    const stdout = readExecStdout(error)
    if (!stdout) throw error
    return JSON.parse(stdout)
  }
}

describe('gate fixtures still fail', () => {
  it.each(FIXTURES)('$file trips $ruleId', ({ file, ruleId, minimumErrors }) => {
    const results = lint(file)
    const errors = results
      .flatMap(result => result.messages)
      .filter(message => message.ruleId === ruleId && message.severity === 2)

    expect(
      errors.length,
      `${file} no longer trips ${ruleId} — the rule may have been disabled or narrowed`
    ).toBeGreaterThanOrEqual(minimumErrors)
  })
})
