import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { watchedFiles } from '../input-hash.mjs'
import { WAVE1_PROMOTION_DECISIONS, Wave1PromotionTarget, PromotionDecision } from '../promotion/wave1-decisions'

enum HumanizerSkillPath {
  File = 'src/mastra/agents/grrm-author/skills/humanizer/SKILL.md',
}

enum AlwaysOnClass {
  OverusedVocab = '## #7',
  Chatbot = '## #20',
  Cutoff = '## #21',
  Sycophantic = '## #22',
  Filler = '## #23',
  Hedging = '## #24',
}

enum FictionAdjustedClass {
  One = '## #1 ',
  Three = '## #3 ',
  Four = '## #4 ',
  Ten = '## #10 ',
  TwentyFive = '## #25 ',
}

describe('always-on Humanizer skill', () => {
  const skill = readFileSync(join(process.cwd(), HumanizerSkillPath.File), 'utf8')

  it('keeps always-on classes and omits fiction-adjusted extras', () => {
    expect(skill).toContain(AlwaysOnClass.OverusedVocab)
    expect(skill).toContain(AlwaysOnClass.Chatbot)
    expect(skill).toContain(AlwaysOnClass.Cutoff)
    expect(skill).toContain(AlwaysOnClass.Sycophantic)
    expect(skill).toContain(AlwaysOnClass.Filler)
    expect(skill).toContain(AlwaysOnClass.Hedging)
    expect(skill).not.toContain(FictionAdjustedClass.One)
    expect(skill).not.toContain(FictionAdjustedClass.Three)
    expect(skill).not.toContain(FictionAdjustedClass.Four)
    expect(skill).not.toContain(FictionAdjustedClass.Ten)
    expect(skill).not.toContain(FictionAdjustedClass.TwentyFive)
    expect(skill).toContain('unless masterPrompt asks')
    expect(WAVE1_PROMOTION_DECISIONS[Wave1PromotionTarget.FictionAdjustedHumanizer]).toBe(
      PromotionDecision.NoGo
    )
    const compose = readFileSync(
      join(process.cwd(), 'src/mastra/agents/grrm-author/compose-instructions.ts'),
      'utf8'
    )
    expect(compose).toContain('GrrmAuthorSkillPath.AntiSlop')
  })

  it('is in the eval freshness watch set', () => {
    expect(watchedFiles()).toContain(HumanizerSkillPath.File)
  })

  it('keeps claim-check on Humanizer output in beat-draft persist', () => {
    const deps = readFileSync(
      join(process.cwd(), 'src/domains/storyteller/ai/workflows/beat-draft-default-deps.ts'),
      'utf8'
    )
    expect(deps).toContain('claimCheckBeat')
    expect(deps).toContain('runClaimCheckBeat')
  })
})
