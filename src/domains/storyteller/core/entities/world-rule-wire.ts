import { readString, recordFromJson } from '@/shared/data/json-guards'
import type { WorldRule } from '@/domains/storyteller/ai/prompts/schemas/agent-schemas'

export enum WorldRuleCategory {
  PHYSICS = 'Physics',
  MAGIC = 'Magic',
  TECHNOLOGY = 'Technology',
  SOCIETY = 'Society',
  POLITICS = 'Politics',
  ECONOMICS = 'Economics',
}

const WORLD_RULE_CATEGORY_VALUES = new Set<string>(Object.values(WorldRuleCategory))

export function parseWorldRuleCategory(value: string): WorldRuleCategory | undefined {
  if (!WORLD_RULE_CATEGORY_VALUES.has(value)) return undefined
  for (const category of Object.values(WorldRuleCategory)) {
    if (category === value) return category
  }
  return undefined
}

export function isWorldRule(value: unknown): value is WorldRule {
  const row = recordFromJson(value)
  const category = readString(row.category)
  const rule = readString(row.rule)
  return Boolean(category && rule && WORLD_RULE_CATEGORY_VALUES.has(category))
}

export interface PlotTwistObject {
  title?: string
  description?: string
  impact?: string
  foreshadowing?: string
}

export function plotTwistObjectFromJson(value: unknown): PlotTwistObject {
  const row = recordFromJson(value)
  return {
    title: readString(row.title),
    description: readString(row.description),
    impact: readString(row.impact),
    foreshadowing: readString(row.foreshadowing),
  }
}
