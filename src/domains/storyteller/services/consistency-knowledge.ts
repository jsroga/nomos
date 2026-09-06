import { BibleSection } from '@/domains/storyteller/core/types/enums'
import {
  AUTHOR_TRUTH_TOKEN_PATTERN,
  COMMON_ENGLISH_TOKENS,
} from '@/domains/storyteller/core/prose-check/constants'
import { recordFromJson, readString } from '@/shared/data/json-guards'
import type { ConsistencyBeatSlice } from './consistency-types'
import {
  ConsistencyIssueType,
  ConsistencySeverity,
  ConsistencySuggestion,
} from '@/domains/storyteller/services/constants/consistency-issues'
import type { ContinuityIssue } from './consistency-issue-shape'

function stringNames(value: unknown): string[] {
  if (!Array.isArray(value)) return []
  return value.filter((name): name is string => typeof name === 'string' && name.length > 0)
}

function plotTwistTokens(storyPlan: unknown): string[] {
  const plan = recordFromJson(storyPlan)
  const raw = JSON.stringify(plan[BibleSection.PLOT_TWISTS] ?? '')
  const tokens = raw.match(AUTHOR_TRUTH_TOKEN_PATTERN) ?? []
  return tokens.filter(token => !COMMON_ENGLISH_TOKENS.has(token.toLowerCase()))
}

function storyFactsHaystack(storyPlan: unknown): string {
  const facts: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(recordFromJson(storyPlan))) {
    if (key === BibleSection.PLOT_TWISTS) continue
    facts[key] = value
  }
  return JSON.stringify(facts).toLowerCase()
}

export function checkCharacterKnowledgeFromRows(
  rows: ConsistencyBeatSlice[],
  storyPlan: unknown
): ContinuityIssue[] {
  const facts = storyFactsHaystack(storyPlan)
  const tokens = plotTwistTokens(storyPlan)
  const issues: ContinuityIssue[] = []
  const seen = new Set<string>()

  for (const beat of rows) {
    const content = readString(beat.content) ?? ''
    if (content.length === 0) continue
    const involved = new Set(stringNames(beat.charactersInvolved).map(name => name.toLowerCase()))
    const lower = content.toLowerCase()

    for (const token of tokens) {
      const key = `${beat.id}:${token.toLowerCase()}`
      if (seen.has(key)) continue
      if (involved.has(token.toLowerCase())) continue
      if (facts.includes(token.toLowerCase())) continue
      if (!lower.includes(token.toLowerCase())) continue
      seen.add(key)
      issues.push({
        type: ConsistencyIssueType.KnowledgeViolation,
        severity: ConsistencySeverity.Major,
        description: `Beat [${beat.id}] names author-truth token "${token}" the POV cannot know`,
        location: beat.id,
        affectedElements: [token],
        suggestion: ConsistencySuggestion.CutAuthorTruthLeak,
      })
    }
  }

  return issues
}
