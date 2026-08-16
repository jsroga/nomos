import { readString } from '@/shared/data/json-guards'
import { CharacterFieldName, EntityKind, ScorerId } from './constants'
import { beatProse } from './beat-text'
import { findPhraseHits } from './phrase-match'
import type {
  CastPerson,
  CharacterFieldFinding,
  DumpedBeat,
  MatchingRules,
  StructuralScore,
} from './types'

const NEGATION_PREFIX = /^(will not|won't|wont|never)\s+/i
const REGEX_ESCAPE = /[.*+?^${}()|[\]\\]/g

function escapeRegex(value: string): string {
  return value.replace(REGEX_ESCAPE, '\\$&')
}

function psychologyString(psychology: Record<string, unknown>, field: CharacterFieldName): string {
  if (field === CharacterFieldName.Wants) {
    return (
      readString(psychology.wants) ??
      readString(psychology.desires) ??
      readString(psychology.actualMotivation) ??
      ''
    )
  }
  if (field === CharacterFieldName.Fears) {
    return readString(psychology.fears) ?? ''
  }
  return readString(psychology.wontBreak) ?? readString(psychology.willNotBreak) ?? ''
}

function inflectionPattern(remainder: string): RegExp | null {
  const words = remainder.trim().split(/\s+/).filter(word => word.length > 0)
  const verb = words[0]
  if (!verb) return null
  const verbBody = `${escapeRegex(verb)}(?:s|ed|ing)?`
  const tail = words.slice(1).map(escapeRegex).join('\\s+')
  const body = tail.length > 0 ? `${verbBody}\\s+${tail}` : verbBody
  return new RegExp(`\\b${body}\\b`, 'i')
}

function characterPresent(prose: string, person: CastPerson, rules: MatchingRules): boolean {
  return (
    findPhraseHits(
      prose,
      [{ term: person.name, aliases: person.aliases, kind: EntityKind.Character }],
      rules,
    ).length > 0
  )
}

function wontBreakContradiction(prose: string, fieldValue: string): boolean {
  if (!NEGATION_PREFIX.test(fieldValue)) return false
  const remainder = fieldValue.replace(NEGATION_PREFIX, '').trim()
  const pattern = inflectionPattern(remainder)
  return pattern ? pattern.test(prose) : false
}

function wantsContradiction(prose: string, wants: string): boolean {
  if (wants.length === 0) return false
  return (
    /\b(no longer wants|does not want|doesn't want)\b/i.test(prose) &&
    prose.toLowerCase().includes(wants.toLowerCase())
  )
}

function fearsContradiction(prose: string, fears: string): boolean {
  if (fears.length === 0) return false
  return (
    /\b(no longer fears|does not fear|doesn't fear|is not afraid of)\b/i.test(prose) &&
    prose.toLowerCase().includes(fears.toLowerCase())
  )
}

export function scoreCharacterFieldAdherence(
  beats: readonly DumpedBeat[],
  cast: readonly CastPerson[],
  rules: MatchingRules,
): StructuralScore {
  const findings: CharacterFieldFinding[] = []

  for (const person of cast) {
    const wants = psychologyString(person.psychology, CharacterFieldName.Wants)
    const fears = psychologyString(person.psychology, CharacterFieldName.Fears)
    const wontBreak = psychologyString(person.psychology, CharacterFieldName.WontBreak)
    for (const beat of beats) {
      const prose = beatProse(beat)
      if (!characterPresent(prose, person, rules)) continue
      if (wontBreakContradiction(prose, wontBreak)) {
        findings.push({
          character: person.name,
          field: CharacterFieldName.WontBreak,
          sequence: beat.sequence,
          hardFail: true,
          evidence: wontBreak,
        })
      }
      if (wantsContradiction(prose, wants)) {
        findings.push({
          character: person.name,
          field: CharacterFieldName.Wants,
          sequence: beat.sequence,
          hardFail: false,
          evidence: wants,
        })
      }
      if (fearsContradiction(prose, fears)) {
        findings.push({
          character: person.name,
          field: CharacterFieldName.Fears,
          sequence: beat.sequence,
          hardFail: false,
          evidence: fears,
        })
      }
    }
  }

  const hardFails = findings.filter(finding => finding.hardFail).length
  return {
    id: ScorerId.CharacterField,
    metrics: {
      findingCount: findings.length,
      wontBreakHardFailCount: hardFails,
    },
    flags: findings,
  }
}
