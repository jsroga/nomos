import { z } from 'zod'
import type { WorldRule } from '@/domains/storyteller/core/types/story-plan-types'

export enum PromotedRuleCategory {
  Society = 'Society',
}

export enum PromotedRuleCopy {
  NamePrefix = 'Promoted v',
  Consequence = 'Later beats treat this as a standing world law.',
  DefaultRule = 'Editorial verdict promoted this continuity constraint.',
  DefaultQuote = 'editorial-verdict',
}

enum PromotedRuleFloor {
  MinRuleChars = 15,
  MaxNameChars = 48,
}

const PromotedWorldRuleSchema = z.object({
  category: z.string().min(1),
  name: z.string().min(2).max(PromotedRuleFloor.MaxNameChars),
  rule: z.string().min(PromotedRuleFloor.MinRuleChars),
  consequence: z.string().min(PromotedRuleFloor.MinRuleChars),
  exceptions: z.string().nullable().optional(),
})

function padRuleText(text: string): string {
  const trimmed = text.trim()
  if (trimmed.length >= PromotedRuleFloor.MinRuleChars) return trimmed
  return `${trimmed} ${PromotedRuleCopy.Consequence}`.trim()
}

export function promotedRuleName(version: number): string {
  const name = `${PromotedRuleCopy.NamePrefix}${String(version)}`
  return name.slice(0, PromotedRuleFloor.MaxNameChars)
}

export function worldRuleFromPromotion(ruleText: string, version: number): WorldRule {
  const parsed = PromotedWorldRuleSchema.safeParse({
    category: PromotedRuleCategory.Society,
    name: promotedRuleName(version),
    rule: padRuleText(ruleText),
    consequence: PromotedRuleCopy.Consequence,
    exceptions: null,
  })
  if (!parsed.success) {
    throw new Error(parsed.error.message)
  }
  return parsed.data
}

export function worldRulesFromUnknown(value: unknown): WorldRule[] {
  if (!Array.isArray(value)) return []
  const rules: WorldRule[] = []
  for (const entry of value) {
    const parsed = PromotedWorldRuleSchema.safeParse(entry)
    if (parsed.success) rules.push(parsed.data)
  }
  return rules
}

export function nextPromotedWorldRules(existing: unknown, incoming: WorldRule): WorldRule[] {
  const current = worldRulesFromUnknown(existing).filter(rule => rule.name !== incoming.name)
  return [...current, incoming]
}

export function revokeWorldRuleByName(existing: unknown, name: string): WorldRule[] {
  return worldRulesFromUnknown(existing).filter(rule => rule.name !== name)
}

export function nextPromotionVersion(existing: unknown): number {
  return (
    worldRulesFromUnknown(existing).filter(rule => rule.name.startsWith(PromotedRuleCopy.NamePrefix))
      .length + 1
  )
}
