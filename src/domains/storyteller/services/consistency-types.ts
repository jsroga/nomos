import { recordArrayFromJson, recordFromJson, readString } from '@/shared/data/json-guards'
import type { beats } from '@/db/schema'

export enum ConsistencyCheckKind {
  WORLD_RULES = 'world_rules',
  CHARACTER_KNOWLEDGE = 'character_knowledge',
  SETUP_PAYOFF = 'setup_payoff',
  TIMELINE = 'timeline',
  ALL = 'all',
}

const CHECK_KIND_VALUES = new Set<string>(Object.values(ConsistencyCheckKind))

export function isConsistencyCheckKind(value: string): value is ConsistencyCheckKind {
  return CHECK_KIND_VALUES.has(value)
}

export function shouldRunCheck(
  checkTypes: ConsistencyCheckKind[],
  kind: ConsistencyCheckKind
): boolean {
  return checkTypes.includes(ConsistencyCheckKind.ALL) || checkTypes.includes(kind)
}

export type BeatRow = typeof beats.$inferSelect

export interface SetupsPayoffsJson {
  setupId?: string
  payoffFor?: string
}

export function setupsPayoffsFromJson(value: unknown): SetupsPayoffsJson {
  return recordFromJson(value)
}

export interface WorldRuleJson {
  rule: string
  consequence?: string
}

export function worldRulesFromStoryPlan(storyPlan: unknown): WorldRuleJson[] {
  const plan = recordFromJson(storyPlan)
  const raw = plan.worldRules
  if (!Array.isArray(raw)) return []

  const rules: WorldRuleJson[] = []
  for (const entry of raw) {
    if (typeof entry === 'string' && entry.length > 0) {
      rules.push({ rule: entry })
      continue
    }
    const row = recordFromJson(entry)
    const rule = readString(row.rule)
    if (rule) {
      rules.push({
        rule,
        consequence: readString(row.consequence),
      })
    }
  }
  return rules
}

export function storyPlanRecord(storyPlan: unknown): Record<string, unknown> {
  return recordFromJson(storyPlan)
}
