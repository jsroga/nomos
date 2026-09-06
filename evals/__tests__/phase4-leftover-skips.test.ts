import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { WAVE1_PROMOTION_DECISIONS, Wave1PromotionTarget, PromotionDecision } from '../promotion/wave1-decisions'

enum SkipSource {
  MastraRuntime = 'src/domains/storyteller/core/io/mastra-runtime.ts',
}

describe('Phase 4 leftover skips', () => {
  it('does not add an object-identity ledger table', () => {
    const schema = readFileSync('src/db/schema-parts/knowledge-ledger-tables.ts', 'utf8')
    expect(schema).not.toMatch(/object[_-]?identity/i)
  })

  it('does not add anchoring or realism critic agents', () => {
    const critics = readFileSync(
      'src/domains/storyteller/ai/agents/critics/constants/critic-agents.ts',
      'utf8'
    )
    expect(critics).not.toMatch(/anchoring/i)
    expect(critics).not.toMatch(/realism/i)
  })

  it('keeps durable autonomy on the in-process cache', () => {
    const runtime = readFileSync(SkipSource.MastraRuntime, 'utf8')
    expect(runtime).toContain('createDurableAgent')
    expect(runtime).not.toMatch(/import\s+\{[^}]*RedisServerCache/)
  })

  it('records Wave 1 fiction-adjusted Humanizer as no-go so anti-slop stays', () => {
    expect(WAVE1_PROMOTION_DECISIONS[Wave1PromotionTarget.FictionAdjustedHumanizer]).toBe(
      PromotionDecision.NoGo
    )
  })
})
