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

export enum WorldRuleTitleSeparator {
  EmDash = ' — ',
  EnDash = ' – ',
  Hyphen = ' - ',
}

export function splitWorldRuleTitle(ruleText: string): { title: string; body: string } {
  for (const separator of Object.values(WorldRuleTitleSeparator)) {
    const index = ruleText.indexOf(separator)
    if (index > 0) {
      return {
        title: ruleText.slice(0, index).trim(),
        body: ruleText.slice(index + separator.length).trim(),
      }
    }
  }
  return { title: ruleText, body: '' }
}

export function worldRuleTileCopy(rule: WorldRule): { title: string; description: string } {
  const named = rule.name?.trim()
  const ruleText = rule.rule?.trim() ?? ''
  const consequence = rule.consequence?.trim() ?? ''
  if (named) {
    return { title: named, description: ruleText || consequence }
  }
  const split = splitWorldRuleTitle(ruleText)
  if (split.body) {
    return { title: split.title, description: split.body }
  }
  return { title: split.title, description: consequence }
}

/** Tool writes often omit category — still show the rule on the World Logic board. */
export function worldRuleForDisplay(value: unknown): WorldRule | null {
  if (typeof value === 'string') {
    const rule = value.trim()
    if (!rule) return null
    const split = splitWorldRuleTitle(rule)
    return {
      category: WorldRuleCategory.SOCIETY,
      name: split.body ? split.title : '',
      rule: split.body || split.title,
      consequence: '',
    }
  }
  const row = recordFromJson(value)
  const rule = readString(row.rule)?.trim()
  if (!rule) return null
  const named = readString(row.name)?.trim()
  const split = splitWorldRuleTitle(rule)
  return {
    category: parseWorldRuleCategory(readString(row.category) ?? '') ?? WorldRuleCategory.SOCIETY,
    name: named || (split.body ? split.title : ''),
    rule: named ? rule : split.body || rule,
    consequence: readString(row.consequence) ?? '',
    exceptions: readString(row.exceptions) ?? null,
  }
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
