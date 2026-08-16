import { CanonBucket, EntityKind, ScorerId, TOKENS_PER_THOUSAND } from './constants'
import { beatProse, tokenCount } from './beat-text'
import { findPhraseHits, maskSpans } from './phrase-match'
import {
  toScoreFlags,
  type CanonFlag,
  type CastPerson,
  type DumpedBeat,
  type LexiconEntry,
  type MatchingRules,
  type StructuralScore,
} from './types'

const TITLE_CASE = /\b[A-Z][A-Za-z']+(?:\s+[A-Z][A-Za-z']+)*\b/g
const SKIP_SINGLE = new Set([
  'A',
  'An',
  'The',
  'When',
  'She',
  'He',
  'Her',
  'His',
  'If',
  'After',
  'Before',
  'Then',
  'They',
  'We',
  'I',
  'You',
  'It',
  'This',
  'That',
  'And',
  'But',
  'For',
  'With',
  'From',
  'In',
  'On',
  'At',
  'To',
  'Of',
  'As',
  'By',
  'Or',
  'Not',
  'No',
])

const ENTITY_KINDS = new Set<EntityKind>([
  EntityKind.Place,
  EntityKind.Institution,
  EntityKind.Law,
  EntityKind.Ritual,
  EntityKind.Object,
  EntityKind.Event,
])

function flagKey(sequence: number, bucket: CanonBucket, matched: string): string {
  return `${sequence}|${bucket}|${matched.toLowerCase()}`
}

function leftoverTitles(masked: string): string[] {
  const found: string[] = []
  TITLE_CASE.lastIndex = 0
  let match = TITLE_CASE.exec(masked)
  while (match) {
    const phrase = match[0]
    const words = phrase.split(/\s+/)
    const first = words[0]
    if (words.length === 1 && first && SKIP_SINGLE.has(first)) {
      match = TITLE_CASE.exec(masked)
      continue
    }
    found.push(phrase)
    match = TITLE_CASE.exec(masked)
  }
  return found
}

function involvedIsKnown(name: string, cast: readonly CastPerson[], rules: MatchingRules): boolean {
  const hits = findPhraseHits(
    name,
    cast.map(person => ({ term: person.name, aliases: person.aliases, kind: EntityKind.Character })),
    rules,
  )
  return hits.length > 0
}

export function scoreCanonViolation(
  beats: readonly DumpedBeat[],
  lexicon: readonly LexiconEntry[],
  cast: readonly CastPerson[],
  rules: MatchingRules,
): StructuralScore {
  const entities = lexicon.filter(entry => ENTITY_KINDS.has(entry.kind))
  const people = cast.map(person => ({
    term: person.name,
    aliases: person.aliases,
    kind: EntityKind.Character,
  }))
  const flags: CanonFlag[] = []
  const seen = new Set<string>()
  let tokens = 0

  function addFlag(sequence: number, matchedString: string, bucket: CanonBucket): void {
    const key = flagKey(sequence, bucket, matchedString)
    if (seen.has(key)) return
    seen.add(key)
    flags.push({ sequence, matchedString, bucket })
  }

  for (const beat of beats) {
    const prose = beatProse(beat)
    tokens += tokenCount(prose)
    const knownHits = [
      ...findPhraseHits(prose, entities, rules),
      ...findPhraseHits(prose, people, rules),
    ]
    const masked = maskSpans(prose, knownHits)
    for (const leftover of leftoverTitles(masked)) {
      const asCharacter = beat.charactersInvolved.some(
        name => name.toLowerCase() === leftover.toLowerCase(),
      )
      addFlag(
        beat.sequence,
        leftover,
        asCharacter ? CanonBucket.NewCharacter : CanonBucket.UnknownEntity,
      )
    }
    for (const name of beat.charactersInvolved) {
      if (!involvedIsKnown(name, cast, rules)) {
        addFlag(beat.sequence, name, CanonBucket.NewCharacter)
      }
    }
  }

  let unknownEntities = 0
  let newCharacters = 0
  for (const flag of flags) {
    if (flag.bucket === CanonBucket.UnknownEntity) unknownEntities += 1
    if (flag.bucket === CanonBucket.NewCharacter) newCharacters += 1
  }
  const flagsPerThousand =
    tokens === 0 ? 0 : (unknownEntities / tokens) * TOKENS_PER_THOUSAND

  return {
    id: ScorerId.CanonViolation,
    metrics: {
      unknownEntityCount: unknownEntities,
      newCharacterCount: newCharacters,
      unknownEntityPerThousandTokens: flagsPerThousand,
      tokenCount: tokens,
    },
    flags: toScoreFlags(flags),
  }
}
