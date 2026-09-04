/**
 * The hash answers one question: were the evals run against *this* prompt?
 * A timestamp would go stale on an unrelated rebase and pass on a rebase that
 * changed a prompt, so the answer has to come from content.
 */
import { appendFileSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import { EVAL_WATCHED_PATHS, hashFromEntries, inputHash, stagedEntries, stagedHash, watchedFiles } from '../input-hash.mjs'

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

  it('changes when evals/constants/thresholds.ts changes', () => {
    buildFixture()
    const thresholdsDir = join(FIXTURE_ROOT, 'evals/constants')
    mkdirSync(thresholdsDir, { recursive: true })
    const thresholdsFile = join(thresholdsDir, 'thresholds.ts')
    writeFileSync(thresholdsFile, 'export const SCORER_NOISE = {}\n')
    const before = inputHash(FIXTURE_ROOT)

    appendFileSync(thresholdsFile, '!')

    expect(inputHash(FIXTURE_ROOT)).not.toBe(before)
  })

  it('watches the real tree, not an empty list', () => {
    expect(watchedFiles().length).toBeGreaterThan(50)
  })
})

describe('stagedHash', () => {
  it('hashes injected entries without reading a git tree', () => {
    const entries = [{ path: 'src/mastra/agents/x/instructions.md', content: 'base prompt\n' }]

    expect(stagedHash(entries)).toBe(hashFromEntries(entries))
    expect(stagedHash([{ path: entries[0].path, content: 'base prompt!\n' }])).not.toBe(
      stagedHash(entries)
    )
  })

  it('matches inputHash when the injected entries are the working tree', () => {
    buildFixture()
    const entries = watchedFiles(FIXTURE_ROOT).map(file => ({
      path: file,
      content: readFileSync(join(FIXTURE_ROOT, file)),
    }))

    expect(stagedHash(entries)).toBe(inputHash(FIXTURE_ROOT))
  })

  it('changes when a staged path is deleted', () => {
    const kept = { path: 'src/mastra/agents/a/instructions.md', content: 'keep\n' }
    const dropped = { path: 'src/mastra/agents/b/SKILL.md', content: 'gone\n' }
    const contents = new Map([
      [kept.path, kept.content],
      [dropped.path, dropped.content],
    ])
    const readContent = (path: string) => contents.get(path) ?? ''

    const before = stagedHash(stagedEntries([kept.path, dropped.path], readContent))
    const after = stagedHash(stagedEntries([kept.path], readContent))

    expect(after).not.toBe(before)
  })

  it('changes when a staged path is renamed with the same bytes', () => {
    const body = 'unchanged skill body\n'
    const beforePath = 'src/mastra/agents/grrm-author/skills/anti-slop/SKILL.md'
    const afterPath = 'src/mastra/agents/grrm-author/skills/anti-slop/RENAMED.md'
    const contents = new Map([
      [beforePath, body],
      [afterPath, body],
    ])
    const readContent = (path: string) => contents.get(path) ?? ''

    const before = stagedHash(stagedEntries([beforePath], readContent))
    const after = stagedHash(stagedEntries([afterPath], readContent))

    expect(after).not.toBe(before)
  })
})
