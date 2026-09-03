import { BibleSection } from '@/domains/storyteller/core/types/enums'
import {
  CanonLayer,
  SECTION_REGISTRY,
  WORLD_BIBLE_SECTIONS,
} from '@/domains/storyteller/core/bible/section-registry'
import {
  FindingSeverity,
  ProblemType,
  type Finding,
} from '@/domains/storyteller/core/types/finding'
import { DraftBeatId, type BeatDraftCanon } from '@/domains/storyteller/core/types/beat-draft-canon'
import { AUTHOR_TRUTH_TOKEN_PATTERN, COMMON_ENGLISH_TOKENS, ViewpointFindingCopy } from './constants'

function storyFactsText(canon: BeatDraftCanon): string {
  const facts: unknown[] = [canon.currentRoadmapSlotText]
  for (const section of WORLD_BIBLE_SECTIONS) {
    const layer = SECTION_REGISTRY[section].canonLayer
    if (layer !== CanonLayer.StoryFacts && layer !== CanonLayer.CharacterKnowledge) continue
    facts.push(canon.sections[section])
  }
  return JSON.stringify(facts).toLowerCase()
}

function authorTruthTokens(canon: BeatDraftCanon): string[] {
  const raw = JSON.stringify(canon.sections[BibleSection.PLOT_TWISTS] ?? '')
  const tokens = raw.match(AUTHOR_TRUTH_TOKEN_PATTERN) ?? []
  return tokens.filter(token => !COMMON_ENGLISH_TOKENS.has(token.toLowerCase()))
}

function firstMatchParagraph(draft: string, token: string): { paragraph: number; quote: string } | null {
  const pattern = new RegExp(`\\b${token}\\b`, 'i')
  const lines = draft.split('\n')
  for (let paragraph = 0; paragraph < lines.length; paragraph += 1) {
    const match = pattern.exec(lines[paragraph])
    if (!match) continue
    return { paragraph, quote: match[0] }
  }
  return null
}

export function checkViewpointOverreach(
  draft: string,
  canon: BeatDraftCanon,
  characters: string[]
): Finding[] {
  const facts = storyFactsText(canon)
  const characterNames = new Set(characters.map(name => name.toLowerCase()))
  const findings: Finding[] = []
  const seen = new Set<string>()

  for (const token of authorTruthTokens(canon)) {
    const key = token.toLowerCase()
    if (seen.has(key)) continue
    if (characterNames.has(key)) continue
    if (facts.includes(key)) continue
    const hit = firstMatchParagraph(draft, token)
    if (!hit) continue
    seen.add(key)
    findings.push({
      location: { beatId: DraftBeatId.Draft, paragraph: hit.paragraph, quote: hit.quote },
      problemType: ProblemType.ViewpointOverreach,
      whatHappensNow: ViewpointFindingCopy.OverreachWhat,
      whyItFails: `"${hit.quote}" appears only in plot twists, not in story facts.`,
      revisionDirection: ViewpointFindingCopy.OverreachDirection,
      severity: FindingSeverity.Error,
      promoteToProjectRule: false,
    })
  }
  return findings
}
