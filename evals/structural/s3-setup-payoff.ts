import { ClimaxBeatType, EntityKind, FINAL_FIFTH, FINAL_THIRD, ScorerId } from './constants'
import { beatProse } from './beat-text'
import { findPhraseHits } from './phrase-match'
import type { DumpedBeat, LexiconEntry, MatchingRules, StructuralScore } from './types'

const SETUP_KINDS = new Set<EntityKind>([
  EntityKind.Object,
  EntityKind.Institution,
  EntityKind.Ritual,
  EntityKind.Place,
])

function isClimaxType(beatType: string): boolean {
  return beatType === ClimaxBeatType.Climax || beatType === ClimaxBeatType.Resolution
}

export function scoreSetupPayoff(
  beats: readonly DumpedBeat[],
  lexicon: readonly LexiconEntry[],
  rules: MatchingRules,
): StructuralScore {
  const trackable = lexicon.filter(entry => SETUP_KINDS.has(entry.kind))
  const ordered = [...beats].sort((a, b) => a.sequence - b.sequence)
  const maxSequence = ordered.reduce((max, beat) => Math.max(max, beat.sequence), 0)
  const lateFifthFrom = maxSequence * FINAL_FIFTH
  const lateThirdFrom = maxSequence * FINAL_THIRD

  const firstMention = new Map<string, number>()
  for (const beat of ordered) {
    const hits = findPhraseHits(beatProse(beat), trackable, rules)
    for (const hit of hits) {
      if (!firstMention.has(hit.term)) firstMention.set(hit.term, beat.sequence)
    }
  }

  const lateAppearances: Array<{ term: string; firstMention: number; lateSequence: number }> = []
  const lateIntroductions: Array<{
    term: string
    firstMention: number
    sequence: number
    beatType: string
  }> = []

  for (const beat of ordered) {
    const hits = findPhraseHits(beatProse(beat), trackable, rules)
    for (const hit of hits) {
      const first = firstMention.get(hit.term) ?? beat.sequence
      if (beat.sequence > lateFifthFrom) {
        lateAppearances.push({ term: hit.term, firstMention: first, lateSequence: beat.sequence })
      }
      if (isClimaxType(beat.beatType) && first > lateThirdFrom) {
        lateIntroductions.push({
          term: hit.term,
          firstMention: first,
          sequence: beat.sequence,
          beatType: beat.beatType,
        })
      }
    }
  }

  return {
    id: ScorerId.SetupPayoff,
    metrics: {
      trackedEntityCount: firstMention.size,
      lateAppearanceCount: lateAppearances.length,
      lateClimaxIntroductionCount: lateIntroductions.length,
    },
    flags: lateIntroductions,
  }
}
