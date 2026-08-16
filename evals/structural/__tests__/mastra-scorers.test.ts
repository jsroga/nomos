import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import { recordFromJson } from '@/shared/data/json-guards'
import { causalGraphScorer, characterFieldScorer } from '../mastra-scorers'

const FIXTURE_DIR = join(dirname(fileURLToPath(import.meta.url)), '../../fixtures/structural')

function readFixture(name: string): Record<string, unknown> {
  return recordFromJson(JSON.parse(readFileSync(join(FIXTURE_DIR, name), 'utf8')))
}

describe('mastra structural scorers', () => {
  it('scores empty causalDependencies as 0 and reports orphanCount', async () => {
    const fixture = readFixture('s1-empty-causal.json')
    const result = await causalGraphScorer.run({ output: fixture.beats })
    expect(result.score).toBe(0)
    expect(result.reason).toContain('orphanCount')
  })

  it('marks empty psychology as NOT_APPLICABLE', async () => {
    const result = await characterFieldScorer.run({
      input: {
        cast: { people: [{ name: 'Sera Voss', aliases: [], psychology: {} }] },
        matchingRules: {
          caseInsensitive: true,
          ignoreLeadingThe: true,
          singularPlural: true,
          explicitAliases: true,
          wholePhraseWordBoundaries: true,
        },
      },
      output: [],
    })
    expect(result.reason).toContain('NOT_APPLICABLE')
  })
})
