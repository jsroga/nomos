import {
  FindingSeverity,
  ProblemType,
  type Finding,
} from '@/domains/storyteller/core/types/finding'
import {
  DraftBeatId,
  type BeatDraftCanon,
  type BeatDraftCanonBeat,
} from '@/domains/storyteller/core/types/beat-draft-canon'
import { scoreCausalGraph, type CausalBeat, type CausalGraphScore } from './causal-graph'
import {
  DroppedThreadExemptBeatType,
  CausalFindingCopy,
  CausalFindingQuote,
  BeatSequenceLabel,
  CAUSAL_QUOTE_MAX_CHARS,
} from './constants'

function isExemptBeatType(beatType: string | null): boolean {
  return (
    beatType === DroppedThreadExemptBeatType.Climax ||
    beatType === DroppedThreadExemptBeatType.Resolution
  )
}

function firstContentLine(content: string | null): string | undefined {
  if (content === null) return undefined
  for (const row of content.split('\n')) {
    const line = row.trim()
    if (line.length === 0) continue
    if (line.length <= CAUSAL_QUOTE_MAX_CHARS) return line
    return line.slice(0, CAUSAL_QUOTE_MAX_CHARS)
  }
  return undefined
}

function sequenceLabel(sequence: number): string {
  return `${BeatSequenceLabel.Prefix} ${sequence}`
}

export function causalBeatQuote(canon: BeatDraftCanon, beatId: string): string {
  if (beatId === DraftBeatId.Draft) return CausalFindingQuote.ThisDraft
  const beat = canon.beats.find(row => row.id === beatId)
  if (beat === undefined) return CausalFindingQuote.UnknownBeat
  const line = firstContentLine(beat.content)
  if (line !== undefined) return line
  return sequenceLabel(beat.sequence)
}

function latestBeatBefore(canon: BeatDraftCanon, sequence: number): BeatDraftCanonBeat | undefined {
  let latest: BeatDraftCanonBeat | undefined
  for (const beat of canon.beats) {
    if (beat.sequence >= sequence) continue
    if (latest === undefined || beat.sequence > latest.sequence) latest = beat
  }
  return latest
}

function phantomBeat(canon: BeatDraftCanon): CausalBeat {
  const parent = latestBeatBefore(canon, canon.nextSequence)
  return {
    id: DraftBeatId.Draft,
    sequence: canon.nextSequence,
    causalDependencies: parent === undefined ? [] : [parent.id],
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

function boardUsesCausalGraph(canon: BeatDraftCanon): boolean {
  return canon.beats.some(beat => beat.causalDependencies.length > 0)
}

function causalFinding(
  beatId: string,
  quote: string,
  copy: { what: string; why: string; direction: string },
  severity: FindingSeverity
): Finding {
  return {
    location: { beatId, paragraph: 0, quote },
    problemType: ProblemType.SpatialOrActionCausality,
    whatHappensNow: copy.what,
    whyItFails: copy.why,
    revisionDirection: copy.direction,
    severity,
    promoteToProjectRule: false,
  }
}

function checkDroppedThreads(canon: BeatDraftCanon, score: CausalGraphScore): Finding[] {
  const findings: Finding[] = []
  for (const beat of canon.beats) {
    const degree = score.inDegree.get(beat.id) ?? 0
    if (degree !== 0) continue
    if (beat.sequence === 1) continue
    if (beat.sequence === score.maxSequence) continue
    if (isExemptBeatType(beat.beatType)) continue
    findings.push(
      causalFinding(
        beat.id,
        causalBeatQuote(canon, beat.id),
        {
          what: CausalFindingCopy.DroppedWhat,
          why: CausalFindingCopy.DroppedWhy,
          direction: CausalFindingCopy.DroppedDirection,
        },
        FindingSeverity.Warning
      )
    )
  }
  return findings
}

export function checkCausalGraph(canon: BeatDraftCanon): Finding[] {
  const beats = toCausalBeats(canon)
  const score = scoreCausalGraph(beats)
  const findings: Finding[] = []
  const phantom = phantomBeat(canon)

  if (phantom.sequence > 1 && phantom.causalDependencies.length === 0) {
    findings.push(
      causalFinding(
        DraftBeatId.Draft,
        CausalFindingQuote.ThisDraft,
        {
          what: CausalFindingCopy.OrphanWhat,
          why: CausalFindingCopy.OrphanWhy,
          direction: CausalFindingCopy.OrphanDirection,
        },
        FindingSeverity.Error
      )
    )
  }

  for (const flag of score.forwardFlags) {
    findings.push(
      causalFinding(
        flag.beatId,
        causalBeatQuote(canon, flag.dependencyId),
        {
          what: CausalFindingCopy.ForwardWhat,
          why: CausalFindingCopy.ForwardWhy,
          direction: CausalFindingCopy.ForwardDirection,
        },
        FindingSeverity.Error
      )
    )
  }

  if (boardUsesCausalGraph(canon)) {
    findings.push(...checkDroppedThreads(canon, score))
  }

  return findings
}
