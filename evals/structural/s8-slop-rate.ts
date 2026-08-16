import { ScorerId, TOKENS_PER_THOUSAND } from './constants'
import { beatProse, tokenCount } from './beat-text'
import type { DumpedBeat, StructuralScore } from './types'

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

export function scoreSlopRate(
  beats: readonly DumpedBeat[],
  corpus: readonly string[],
): StructuralScore {
  const flags: Array<{ sequence: number; phrase: string; matchedString: string }> = []
  let tokens = 0

  for (const beat of beats) {
    const prose = beatProse(beat)
    tokens += tokenCount(prose)
    for (const phrase of corpus) {
      const pattern = new RegExp(escapeRegex(phrase), 'gi')
      let match = pattern.exec(prose)
      while (match) {
        flags.push({ sequence: beat.sequence, phrase, matchedString: match[0] })
        if (match[0].length === 0) break
        match = pattern.exec(prose)
      }
    }
  }

  const perThousand = tokens === 0 ? 0 : (flags.length / tokens) * TOKENS_PER_THOUSAND
  return {
    id: ScorerId.SlopRate,
    metrics: {
      hitCount: flags.length,
      hitsPerThousandTokens: perThousand,
      tokenCount: tokens,
    },
    flags,
  }
}
