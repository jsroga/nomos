import '@/shared/data/server-guard'
import { db } from '@/domains/storyteller/core/io/beat-sequence'
import { characters } from '@/db/schema'
import { eq } from 'drizzle-orm'
import {
  packInvolvedVoiceFingerprints,
  type NamedVoiceFingerprint,
} from '@/domains/storyteller/core/voice/pack-involved-voice-fingerprints'
import { voiceFingerprintFromUnknown } from '@/domains/storyteller/core/voice/voice-fingerprint'

export enum BeatDraftVoiceHeading {
  Fingerprints = '## Voice fingerprints',
}

enum BeatDraftVoiceJoin {
  Suffix = '\n\n',
  Line = '\n',
}

export function authorVoiceFingerprintsBlock(
  fingerprints: readonly NamedVoiceFingerprint[],
  involved: readonly string[]
): string {
  const packed = packInvolvedVoiceFingerprints(fingerprints, involved)
  if (packed.length === 0) return ''
  return `${BeatDraftVoiceHeading.Fingerprints}${BeatDraftVoiceJoin.Line}${packed}${BeatDraftVoiceJoin.Suffix}`
}

export async function loadProjectVoiceFingerprints(
  projectId: string
): Promise<NamedVoiceFingerprint[]> {
  const rows = await db
    .select({ name: characters.name, voice: characters.voice })
    .from(characters)
    .where(eq(characters.projectId, projectId))
  return rows.map(row => ({
    name: row.name,
    voice: voiceFingerprintFromUnknown(row.voice),
  }))
}

export async function packBeatDraftAuthorFingerprints(
  projectId: string,
  involved: readonly string[]
): Promise<string> {
  if (involved.length === 0) return ''
  const fingerprints = await loadProjectVoiceFingerprints(projectId)
  return authorVoiceFingerprintsBlock(fingerprints, involved)
}
