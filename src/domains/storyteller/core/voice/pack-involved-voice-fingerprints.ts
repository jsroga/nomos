import type { VoiceFingerprint } from './voice-fingerprint'

export interface NamedVoiceFingerprint {
  name: string
  voice: VoiceFingerprint
}

enum VoiceFingerprintPackJoin {
  Line = '\n',
  Samples = ' | ',
}

function involvedNameSet(involved: readonly string[]): Set<string> {
  return new Set(involved.map(name => name.trim().toLowerCase()).filter(name => name.length > 0))
}

function formatFingerprintLine(entry: NamedVoiceFingerprint): string {
  const samples = entry.voice.sampleLines.join(VoiceFingerprintPackJoin.Samples)
  return `${entry.name}: ${entry.voice.register} ${samples}`.trim()
}

export function packInvolvedVoiceFingerprints(
  fingerprints: readonly NamedVoiceFingerprint[],
  involved: readonly string[]
): string {
  const wanted = involvedNameSet(involved)
  if (wanted.size === 0) return ''
  return fingerprints
    .filter(entry => wanted.has(entry.name.trim().toLowerCase()))
    .map(formatFingerprintLine)
    .join(VoiceFingerprintPackJoin.Line)
}
