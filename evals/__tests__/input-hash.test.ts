/**
 * The hash answers one question: were the evals run against *this* prompt?
 * A timestamp would go stale on an unrelated rebase and pass on a rebase that
 * changed a prompt, so the answer has to come from content.
 */
import { appendFileSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import { EVAL_WATCHED_PATHS, inputHash, watchedFiles } from '../input-hash.mjs'

const FIXTURE_ROOT = 'evals/__tests__/.hash-fixture'
const PROMPT_FILE = join(FIXTURE_ROOT, EVAL_WATCHED_PATHS[0], 'prompt.ts')

function buildFixture(): void {
  mkdirSync(join(FIXTURE_ROOT, EVAL_WATCHED_PATHS[0]), { recursive: true })
  writeFileSync(PROMPT_FILE, 'export const PROMPT = "write a beat"\n')
}

afterEach(() => {
  rmSync(FIXTURE_ROOT, { recursive: true, force: true })
})

describe('inputHash', () => {
  it('is stable across two runs over unchanged sources', () => {
    buildFixture()

    expect(inputHash(FIXTURE_ROOT)).toBe(inputHash(FIXTURE_ROOT))
  })

  it('changes when one prompt file changes by one character', () => {
    buildFixture()
    const before = inputHash(FIXTURE_ROOT)

    appendFileSync(PROMPT_FILE, '!')

    expect(inputHash(FIXTURE_ROOT)).not.toBe(before)
  })

  it('changes when a watched file is renamed but its content is not', () => {
    buildFixture()
    const before = inputHash(FIXTURE_ROOT)

    const content = readFileSync(PROMPT_FILE, 'utf8')
    rmSync(PROMPT_FILE)
    writeFileSync(PROMPT_FILE.replace('prompt.ts', 'renamed.ts'), content)

    expect(inputHash(FIXTURE_ROOT)).not.toBe(before)
  })

  it('ignores tests, so editing a spec does not invalidate a run', () => {
    buildFixture()
    const before = inputHash(FIXTURE_ROOT)

    writeFileSync(PROMPT_FILE.replace('prompt.ts', 'prompt.test.ts'), 'it("x", () => {})\n')

    expect(inputHash(FIXTURE_ROOT)).toBe(before)
  })

  it('watches the real tree, not an empty list', () => {
    expect(watchedFiles().length).toBeGreaterThan(50)
  })
})
