import { ArtifactKind } from '@/domains/storyteller/core/types/artifact-kind'
import { BibleSection } from '@/domains/storyteller/core/types/enums'
import {
  FindingSeverity,
  ProblemType,
  type Finding,
} from '@/domains/storyteller/core/types/finding'
import { recordFromJson, readString } from '@/shared/data/json-guards'

enum ArtifactContinuityCopy {
  What = 'The draft asserts a capability the world rules forbid.',
  WhyPrefix = 'Contradicts world rule: ',
  Direction = 'Rewrite so the draft obeys the existing world rule.',
}

enum NegationPrefix {
  Cannot = 'cannot ',
  CanNot = 'can not ',
  MustNot = 'must not ',
  Never = 'never ',
  ForbiddenTo = 'forbidden to ',
}

const CHECKED_SECTIONS = [BibleSection.FACTIONS, BibleSection.WORLD_RULES] as const

const NEGATION_PREFIXES = [
  NegationPrefix.Cannot,
  NegationPrefix.CanNot,
  NegationPrefix.MustNot,
  NegationPrefix.Never,
  NegationPrefix.ForbiddenTo,
] as const

export interface ArtifactWorldRuleContinuityInput {
  kind: ArtifactKind
  draft: string
  worldRules: readonly string[]
  section?: BibleSection
}

function parseJson(text: string): unknown {
  try {
    return JSON.parse(text)
  } catch {
    return undefined
  }
}

function draftHaystack(draft: string): string {
  const parsed = parseJson(draft)
  if (!Array.isArray(parsed)) return draft
  const parts: string[] = []
  for (const entry of parsed) {
    if (typeof entry === 'string') {
      parts.push(entry)
      continue
    }
    const rec = recordFromJson(entry)
    const name = readString(rec.name)
    const description = readString(rec.description)
    const rule = readString(rec.rule)
    if (name) parts.push(name)
    if (description) parts.push(description)
    if (rule) parts.push(rule)
  }
  return parts.join(' ')
}

function forbiddenStem(rule: string): string | undefined {
  const lower = rule.toLowerCase()
  for (const prefix of NEGATION_PREFIXES) {
    const index = lower.indexOf(prefix)
    if (index < 0) continue
    const stem = lower.slice(index + prefix.length).trim()
    if (stem.length > 0) return stem
  }
  return undefined
}

function quoteFromDraft(haystack: string, stem: string): string {
  const lower = haystack.toLowerCase()
  const at = lower.indexOf(stem)
  if (at < 0) return haystack.slice(0, stem.length) || stem
  return haystack.slice(at, at + stem.length)
}

function sectionFor(input: ArtifactWorldRuleContinuityInput): BibleSection {
  if (input.section === BibleSection.WORLD_RULES) return BibleSection.WORLD_RULES
  return BibleSection.FACTIONS
}

function shouldCheck(input: ArtifactWorldRuleContinuityInput): boolean {
  if (input.kind !== ArtifactKind.BibleSection) return false
  return CHECKED_SECTIONS.some(section => section === input.section)
}

export function checkArtifactWorldRuleContinuity(
  input: ArtifactWorldRuleContinuityInput
): Finding[] {
  if (!shouldCheck(input)) return []
  const haystack = draftHaystack(input.draft)
  const hayLower = haystack.toLowerCase()
  const findings: Finding[] = []
  const section = sectionFor(input)
  for (const rule of input.worldRules) {
    const stem = forbiddenStem(rule)
    if (!stem) continue
    if (!hayLower.includes(stem)) continue
    const stillNegated = NEGATION_PREFIXES.some(prefix =>
      hayLower.includes(`${prefix}${stem}`)
    )
    if (stillNegated) continue
    findings.push({
      location: {
        section,
        paragraph: 0,
        quote: quoteFromDraft(haystack, stem),
      },
      problemType: ProblemType.ChapterContinuity,
      whatHappensNow: ArtifactContinuityCopy.What,
      whyItFails: `${ArtifactContinuityCopy.WhyPrefix}${rule}`,
      revisionDirection: ArtifactContinuityCopy.Direction,
      severity: FindingSeverity.Error,
      promoteToProjectRule: false,
    })
  }
  return findings
}
