import {
  FindingSeverity,
  ProblemType,
  type Finding,
} from '@/domains/storyteller/core/types/finding'
import { DraftBeatId, type BeatDraftCanon } from '@/domains/storyteller/core/types/beat-draft-canon'
import { scoreCausalGraph, type CausalBeat } from './causal-graph'
import { DroppedThreadExemptBeatType, CausalFindingCopy } from './constants'

function isExemptBeatType(beatType: string | null): boolean {
  return (
    beatType === DroppedThreadExemptBeatType.Climax ||
    beatType === DroppedThreadExemptBeatType.Resolution
  )
}

function phantomBeat(canon: BeatDraftCanon): CausalBeat {
  return {
    id: DraftBeatId.Draft,
    sequence: canon.nextSequence,
    causalDependencies: [],
    beatType: null,
  }
}

function toCausalBeats(canon: BeatDraftCanon): CausalBeat[] {
  return [
    ...canon.beats.map(beat => ({
      id: beat.id,
      sequence: beat.sequence,
      causalDependencies: beat.causalDependencies,
      beatType: beat.beatType,
    })),
    phantomBeat(canon),
  ]
}

export function checkCausalGraph(canon: BeatDraftCanon): Finding[] {
  const beats = toCausalBeats(canon)
  const score = scoreCausalGraph(beats)
  const findings: Finding[] = []
  const phantom = phantomBeat(canon)

  if (phantom.sequence > 1 && phantom.causalDependencies.length === 0) {
    findings.push({
      location: { beatId: DraftBeatId.Draft, paragraph: 0, quote: DraftBeatId.Draft },
      problemType: ProblemType.SpatialOrActionCausality,
      whatHappensNow: CausalFindingCopy.OrphanWhat,
      whyItFails: CausalFindingCopy.OrphanWhy,
      revisionDirection: CausalFindingCopy.OrphanDirection,
      severity: FindingSeverity.Error,
      promoteToProjectRule: false,
    })
  }

  for (const flag of score.forwardFlags) {
    findings.push({
      location: { beatId: flag.beatId, paragraph: 0, quote: flag.dependencyId },
      problemType: ProblemType.SpatialOrActionCausality,
      whatHappensNow: CausalFindingCopy.ForwardWhat,
      whyItFails: CausalFindingCopy.ForwardWhy,
      revisionDirection: CausalFindingCopy.ForwardDirection,
      severity: FindingSeverity.Error,
      promoteToProjectRule: false,
    })
  }

  for (const beat of canon.beats) {
    const degree = score.inDegree.get(beat.id) ?? 0
    if (degree !== 0) continue
    if (beat.sequence === 1) continue
    if (beat.sequence === score.maxSequence) continue
    if (isExemptBeatType(beat.beatType)) continue
    findings.push({
      location: { beatId: beat.id, paragraph: 0, quote: beat.id },
      problemType: ProblemType.SpatialOrActionCausality,
      whatHappensNow: CausalFindingCopy.DroppedWhat,
      whyItFails: CausalFindingCopy.DroppedWhy,
      revisionDirection: CausalFindingCopy.DroppedDirection,
      severity: FindingSeverity.Warning,
      promoteToProjectRule: false,
    })
  }

  return findings
}
