import '@/shared/data/server-guard'
import { and, eq, isNull } from 'drizzle-orm'
import { db } from '@/domains/storyteller/core/io/beat-sequence'
import { projects, promotedProjectRules } from '@/db/schema'
import { persistBibleOwnedPlanFields } from '@/domains/storyteller/core/io/persist-bible-owned-plan'
import { recordFromJson } from '@/shared/data/deep-merge'
import {
  nextPromotedWorldRules,
  nextPromotionVersion,
  PromotedRuleCopy,
  revokeWorldRuleByName,
  worldRuleFromPromotion,
} from '@/domains/storyteller/core/promote-rule/promoted-rule'
import type { WorldRule } from '@/domains/storyteller/core/types/story-plan-types'
import { BibleSection } from '@/domains/storyteller/core/types/enums'

export { PromotedRuleCopy }

async function loadWorldRules(projectId: string): Promise<unknown> {
  const [project] = await db
    .select({ seriesBible: projects.seriesBible })
    .from(projects)
    .where(eq(projects.id, projectId))
    .limit(1)
  return recordFromJson(project?.seriesBible)[BibleSection.WORLD_RULES]
}

export async function persistPromotedProjectRule(input: {
  projectId: string
  ruleText: string
  quote: string
}): Promise<WorldRule> {
  const existing = await loadWorldRules(input.projectId)
  const version = nextPromotionVersion(existing)
  const incoming = worldRuleFromPromotion(input.ruleText, version)
  await persistBibleOwnedPlanFields(input.projectId, {
    [BibleSection.WORLD_RULES]: nextPromotedWorldRules(existing, incoming),
  })
  try {
    await db.insert(promotedProjectRules).values({
      projectId: input.projectId,
      ruleName: incoming.name,
      ruleText: incoming.rule,
      consequence: incoming.consequence,
      version,
      promotedFrom: input.quote || PromotedRuleCopy.DefaultQuote,
    })
  } catch {
    // Dedicated table may not be applied yet; bible world-rules still persist.
  }
  return incoming
}

export async function revokePromotedProjectRule(input: {
  projectId: string
  ruleName: string
}): Promise<void> {
  const existing = await loadWorldRules(input.projectId)
  await persistBibleOwnedPlanFields(input.projectId, {
    [BibleSection.WORLD_RULES]: revokeWorldRuleByName(existing, input.ruleName),
  })
  try {
    await db
      .update(promotedProjectRules)
      .set({ revokedAt: new Date(), updatedAt: new Date() })
      .where(
        and(
          eq(promotedProjectRules.projectId, input.projectId),
          eq(promotedProjectRules.ruleName, input.ruleName),
          isNull(promotedProjectRules.revokedAt)
        )
      )
  } catch {
    // Dedicated table may not be applied yet.
  }
}
