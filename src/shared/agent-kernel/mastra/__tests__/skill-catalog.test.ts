import { describe, expect, it } from 'vitest'
import { formatSkillCatalogL1 } from '../skill-catalog-l1'
import { SkillCatalogId, SkillCatalogLevel, SkillCatalogStage, SkillManuscriptFormat } from '../skill-catalog-ids'
import {
  SKILL_CATALOG,
  SkillCatalogDescription,
  SkillCatalogOwner,
  SkillCatalogProblemMatch,
  type SkillCatalogRow,
} from '../skill-catalog-registry'
import { resolveMatchedSkillIds, resolveSkillCatalog } from '../skill-catalog-resolve'

describe('formatSkillCatalogL1', () => {
  it('contains every catalog id and not a full SKILL.md body marker', () => {
    const l1 = formatSkillCatalogL1()
    for (const row of SKILL_CATALOG) {
      expect(l1).toContain(row.id)
      expect(l1).toContain(row.description)
    }
    expect(l1).not.toContain('---\nname:')
    expect(l1).not.toContain('## Always-on')
    expect(l1.split('\n').length).toBeLessThan(30)
  })
})

describe('resolveSkillCatalog', () => {
  it('returns L2 match for character introductions on draft + problem type', () => {
    const resolved = resolveSkillCatalog({
      stage: SkillCatalogStage.Draft,
      problemTypes: [SkillCatalogProblemMatch.CharacterIntroductionPascal],
    })
    const intro = resolved.find(row => row.id === SkillCatalogId.CharacterIntroductions)
    expect(intro?.level).toBe(SkillCatalogLevel.L2)
  })

  it('returns L1 only when stage/problem do not match a row', () => {
    const matched = resolveMatchedSkillIds({
      stage: SkillCatalogStage.Humanize,
      problemTypes: ['not-a-real-problem'],
    })
    expect(matched).toEqual([])
  })

  it('picks up a fake catalog row without editing compose-instructions', () => {
    const fakeId = SkillCatalogId.Planning
    const fake: SkillCatalogRow = {
      id: fakeId,
      description: SkillCatalogDescription.Planning,
      owners: [SkillCatalogOwner.Planner],
      match: {
        stages: [SkillCatalogStage.Humanize],
        problemTypes: [SkillCatalogProblemMatch.FakeMatchToken],
        hardRules: [],
      },
    }
    const matched = resolveMatchedSkillIds({
      stage: SkillCatalogStage.Humanize,
      problemTypes: [SkillCatalogProblemMatch.FakeMatchToken],
      catalog: [fake],
    })
    expect(matched).toEqual([fakeId])
  })

  it('loads exactly one manuscript format skill from Draft mode, never both', () => {
    const manuscriptIds = new Set([SkillCatalogId.ManuscriptScript, SkillCatalogId.ManuscriptNovel])
    const scriptMatched = resolveMatchedSkillIds({
      stage: SkillCatalogStage.Draft,
      manuscriptFormat: SkillManuscriptFormat.Script,
    }).filter(id => manuscriptIds.has(id))
    expect(scriptMatched).toEqual([SkillCatalogId.ManuscriptScript])

    const novelMatched = resolveMatchedSkillIds({
      stage: SkillCatalogStage.Draft,
      manuscriptFormat: SkillManuscriptFormat.Novel,
    }).filter(id => manuscriptIds.has(id))
    expect(novelMatched).toEqual([SkillCatalogId.ManuscriptNovel])

    const neither = resolveMatchedSkillIds({
      stage: SkillCatalogStage.Draft,
    }).filter(id => manuscriptIds.has(id))
    expect(neither).toEqual([])
  })

  it('keeps INT./EXT. in the script L2 body and out of the novel L2 body', () => {
    const slug = 'INT./EXT.'
    const script = resolveSkillCatalog({
      stage: SkillCatalogStage.Draft,
      manuscriptFormat: SkillManuscriptFormat.Script,
    }).find(row => row.id === SkillCatalogId.ManuscriptScript)
    const novel = resolveSkillCatalog({
      stage: SkillCatalogStage.Draft,
      manuscriptFormat: SkillManuscriptFormat.Novel,
    }).find(row => row.id === SkillCatalogId.ManuscriptNovel)
    expect(script?.body).toContain(slug)
    expect(novel?.body).toBeDefined()
    expect(novel?.body).not.toContain(slug)
  })

  it('loads cognition and dialogue L2 bodies on matching problem types, not on plan-only', () => {
    const cognition = resolveSkillCatalog({
      stage: SkillCatalogStage.Critique,
      problemTypes: [SkillCatalogProblemMatch.Cognition],
    }).find(row => row.id === SkillCatalogId.CognitionLayersAndLanguage)
    const dialogue = resolveSkillCatalog({
      stage: SkillCatalogStage.Critique,
      problemTypes: [SkillCatalogProblemMatch.Dialogue],
    }).find(row => row.id === SkillCatalogId.DialogueAndBehavior)
    const planOnly = resolveSkillCatalog({
      stage: SkillCatalogStage.Plan,
      problemTypes: [SkillCatalogProblemMatch.Dialogue],
    }).find(row => row.id === SkillCatalogId.DialogueAndBehavior)

    expect(cognition?.level).toBe(SkillCatalogLevel.L2)
    expect(cognition?.body).toContain('Access limits')
    expect(dialogue?.level).toBe(SkillCatalogLevel.L2)
    expect(dialogue?.body).toContain('Talking-heads')
    expect(planOnly?.level).toBe(SkillCatalogLevel.L1)
    expect(planOnly?.body).toBeUndefined()
  })
})

describe('SkillHardRuleId coverage', () => {
  it('cites five hard-rule ids in the registry matchers', async () => {
    const { SkillHardRuleId } = await import('../skill-catalog-ids')
    const cited = new Set(
      SKILL_CATALOG.flatMap(row => row.match.hardRules)
    )
    expect(cited.has(SkillHardRuleId.NakedCharacterEntry)).toBe(true)
    expect(cited.has(SkillHardRuleId.AccessLimits)).toBe(true)
    expect(cited.has(SkillHardRuleId.EmbodiedDialogue)).toBe(true)
    expect(cited.has(SkillHardRuleId.StyleProtection)).toBe(true)
    expect(cited.has(SkillHardRuleId.ProjectRulesOverride)).toBe(true)
  })
})
