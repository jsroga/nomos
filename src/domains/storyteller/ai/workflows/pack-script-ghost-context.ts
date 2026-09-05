import '@/shared/data/server-guard'
import {
  CanonAudience,
  formatCanonFor,
  type BeatDraftCanon,
  type BeatDraftCanonBeat,
} from '@/domains/storyteller/ai/workflows/beat-draft-canon'
import { packMasterPromptVoice } from '@/domains/storyteller/services/pack-master-prompt-voice'
import {
  packInvolvedVoiceFingerprints,
  type NamedVoiceFingerprint,
} from '@/domains/storyteller/core/voice/pack-involved-voice-fingerprints'

export enum ScriptGhostPackHeading {
  Premise = '## Episode premise',
  Voice = '## Voice fingerprints',
  BeatPrefix = '## Beat',
  Manuscript = '## Manuscript before caret',
}

enum ScriptGhostPackJoin {
  Blocks = '\n\n',
}

export interface PackScriptGhostContextInput {
  masterPrompt: string
  canon: BeatDraftCanon
  episodePremise: string
  prefix: string
  charactersInvolved?: string[]
  fingerprints?: readonly NamedVoiceFingerprint[]
}

export function beatsCoveringCaret(
  beats: BeatDraftCanonBeat[],
  prefix: string
): BeatDraftCanonBeat[] {
  const sorted = [...beats].sort((left, right) => left.sequence - right.sequence)
  const first = sorted[0]
  if (first === undefined) return []
  if (prefix.trim().length === 0) return [first]

  let used = 0
  const covering: BeatDraftCanonBeat[] = []
  for (const beat of sorted) {
    covering.push(beat)
    const body = beat.content ?? ''
    used += body.length > 0 ? body.length : 1
    if (used >= prefix.length) break
  }
  return covering
}

function labeledBlock(heading: ScriptGhostPackHeading, body: string): string {
  const trimmed = body.trim()
  if (trimmed.length === 0) return ''
  return `${heading}\n${trimmed}`
}

function formatBeatCards(beats: BeatDraftCanonBeat[]): string {
  if (beats.length === 0) return ''
  return beats
    .map(beat => {
      const body = beat.content?.trim() ?? ''
      return body.length > 0
        ? `${ScriptGhostPackHeading.BeatPrefix} ${beat.sequence}\n${body}`
        : `${ScriptGhostPackHeading.BeatPrefix} ${beat.sequence}`
    })
    .join(ScriptGhostPackJoin.Blocks)
}

export function packScriptGhostContext(input: PackScriptGhostContextInput): string {
  const covering = beatsCoveringCaret(input.canon.beats, input.prefix)
  const involved = input.charactersInvolved ?? []
  const parts = [
    packMasterPromptVoice(input.masterPrompt),
    formatCanonFor(CanonAudience.Author, input.canon, involved),
    labeledBlock(
      ScriptGhostPackHeading.Voice,
      packInvolvedVoiceFingerprints(input.fingerprints ?? [], involved)
    ),
    labeledBlock(ScriptGhostPackHeading.Premise, input.episodePremise),
    formatBeatCards(covering),
    labeledBlock(ScriptGhostPackHeading.Manuscript, input.prefix),
  ]
  return parts.filter(part => part.length > 0).join(ScriptGhostPackJoin.Blocks)
}
