import { ScorerId } from './constants'
import { beatProse } from './beat-text'
import type { DumpedBeat, StructuralScore } from './types'

enum AdjacentHit {
  TalkingHeads = 'talking-heads',
}

const SPEAKER_CUE = /^[A-Z][A-Z0-9 '.-]{1,30}$/

function isSpeakerCue(line: string): boolean {
  return SPEAKER_CUE.test(line.trim())
}

/** Deterministic talking-heads flags. Not registered in ALL_SCORERS. */
export function scoreDialogueAdjacency(beats: readonly DumpedBeat[]): StructuralScore {
  const flags: Array<{ sequence: number; phrase: string; matchedString: string }> = []
  for (const beat of beats) {
    const cues = beatProse(beat)
      .split('\n')
      .map(line => line.trim())
      .filter(line => isSpeakerCue(line))
    if (cues.length < 2) continue
    flags.push({
      sequence: beat.sequence,
      phrase: AdjacentHit.TalkingHeads,
      matchedString: cues.slice(0, 2).join(' '),
    })
  }
  return {
    id: ScorerId.DialogueAdjacency,
    metrics: { hitCount: flags.length },
    flags,
  }
}
