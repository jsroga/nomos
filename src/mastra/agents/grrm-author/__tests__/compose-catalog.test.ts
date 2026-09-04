import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { composeGrrmInstructions } from '../compose-instructions'
import {
  SkillCatalogLevel,
  SkillCatalogStage,
} from '@/shared/agent-kernel/mastra/skill-catalog-ids'
import {
  resolveMatchedSkillIds,
  resolveSkillCatalog,
} from '@/shared/agent-kernel/mastra/skill-catalog-resolve'
import { SkillCatalogProblemMatch } from '@/shared/agent-kernel/mastra/skill-catalog-registry'
import { emitRunTrace, RunTraceEventType, subscribeRunTrace } from '@/shared/agent-kernel/run-trace'

const PACK_ON_FIXTURE = join(
  process.cwd(),
  'evals/fixtures/grrm-pack/compose-pack-on.txt'
)

describe('composeGrrmInstructions catalog', () => {
  it('keeps banned phrases and catalog L1 when skills are on', () => {
    const text = composeGrrmInstructions({ stage: SkillCatalogStage.Draft })
    expect(text).toMatch(/banned|anti-slop|slop/i)
    expect(text).toContain('planning:')
    expect(text).not.toContain('Motivation authenticity')
  })

  it('critique-stage L2 body payload is below the frozen unconditional pack length', () => {
    const frozen = readFileSync(PACK_ON_FIXTURE, 'utf8')
    const resolved = resolveSkillCatalog({
      stage: SkillCatalogStage.Critique,
      problemTypes: [],
    })
    const l2BodyChars = resolved.reduce((total, skill) => {
      if (skill.level !== SkillCatalogLevel.L2 || !skill.body) return total
      return total + skill.body.length
    }, 0)
    expect(resolveMatchedSkillIds({
      stage: SkillCatalogStage.Critique,
      problemTypes: [],
    })).toEqual([])
    expect(l2BodyChars).toBeLessThan(frozen.length)

    const alwaysOnMatched = resolveMatchedSkillIds({
      stage: SkillCatalogStage.Draft,
      problemTypes: Object.values(SkillCatalogProblemMatch),
    })
    expect(alwaysOnMatched.length).toBeGreaterThan(0)
  })

  it('emits SkillResolve without throwing when a listener fails', () => {
    const seen: string[] = []
    const unsubscribe = subscribeRunTrace(event => {
      if (event.type === RunTraceEventType.SkillResolve && event.detail) {
        seen.push(event.detail)
      }
      throw new Error('listener must not break emit')
    })
    expect(() =>
      composeGrrmInstructions({
        stage: SkillCatalogStage.Draft,
        problemTypes: [SkillCatalogProblemMatch.Dialogue],
      })
    ).not.toThrow()
    unsubscribe()
    expect(seen.some(detail => detail.includes(SkillCatalogLevel.L2))).toBe(true)
    expect(() =>
      emitRunTrace({ type: RunTraceEventType.SkillResolve, detail: 'probe' })
    ).not.toThrow()
  })
})
