import { describe, expect, it } from 'vitest'
import { BibleSection } from '@/domains/storyteller/core/types/enums'
import {
  nextPromotedWorldRules,
  nextPromotionVersion,
  promotedRuleName,
  PromotedRuleCopy,
  revokeWorldRuleByName,
  worldRuleFromPromotion,
} from '../promoted-rule'
import {
  CanonAudience,
  emptyBeatDraftCanon,
  formatCanonFor,
} from '@/domains/storyteller/ai/workflows/beat-draft-canon'
import { FindingSchema, FindingSeverity, ProblemType } from '@/domains/storyteller/core/types/finding'
import { PROMOTE_RULE_TOOL_ID } from '@/domains/storyteller/ai/tools/manage-tools-wire'
import { promoteRuleTool } from '@/domains/storyteller/ai/tools/promote-rule-tool'
import { buildStorytellerControllerModes, StorytellerControllerMode } from '@/domains/storyteller/ai/controller/storyteller-controller'
import { readFileSync } from 'node:fs'

describe('promote project rule', () => {
  it('defaults new findings to promoteToProjectRule false', () => {
    const parsed = FindingSchema.parse({
      location: { beatId: 'draft', paragraph: 0, quote: 'the bells' },
      problemType: ProblemType.ViewpointOverreach,
      whatHappensNow: 'A secret leaks.',
      whyItFails: 'POV cannot know this.',
      revisionDirection: 'Cut the secret.',
      severity: FindingSeverity.Error,
    })
    expect(parsed.promoteToProjectRule).toBe(false)
  })

  it('keeps producers hardcoding false', () => {
    const hygiene = readFileSync('src/domains/storyteller/core/prose-check/hygiene.ts', 'utf8')
    expect(hygiene).toContain('promoteToProjectRule: false')
  })

  it('sticks a promoted world rule into Continuity canon', () => {
    const incoming = worldRuleFromPromotion(PromotedRuleCopy.DefaultRule, 1)
    const worldRules = nextPromotedWorldRules([], incoming)
    const canon = emptyBeatDraftCanon({
      sections: { [BibleSection.WORLD_RULES]: worldRules },
    })
    const continuity = formatCanonFor(CanonAudience.Continuity, canon, ['Vera'])
    expect(continuity).toContain(incoming.rule)
    expect(nextPromotionVersion(worldRules)).toBe(2)
    expect(revokeWorldRuleByName(worldRules, promotedRuleName(1))).toEqual([])
  })

  it('registers promote_rule as a write that chat/plan mode cannot see', () => {
    expect(promoteRuleTool.id).toBe(PROMOTE_RULE_TOOL_ID)
    const chat = buildStorytellerControllerModes().find(
      mode => mode.id === StorytellerControllerMode.Chat
    )
    expect(chat?.availableTools ?? []).not.toContain(PROMOTE_RULE_TOOL_ID)
  })
})
