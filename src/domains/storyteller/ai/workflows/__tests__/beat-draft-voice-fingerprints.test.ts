import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { EMPTY_VOICE_FINGERPRINT } from '@/domains/storyteller/core/voice/voice-fingerprint'
import {
  authorVoiceFingerprintsBlock,
  BeatDraftVoiceHeading,
} from '@/domains/storyteller/ai/workflows/beat-draft-voice-fingerprints'

enum FingerprintSource {
  BeatDraftDeps = 'src/domains/storyteller/ai/workflows/beat-draft-default-deps.ts',
  ArtifactDeps = 'src/domains/storyteller/ai/workflows/artifact-draft-default-deps.ts',
  ArtifactWorkflow = 'src/domains/storyteller/ai/workflows/artifact-draft-workflow.ts',
}

enum FingerprintToken {
  PackHelper = 'packBeatDraftAuthorFingerprints',
  PackInvolved = 'packInvolvedVoiceFingerprints',
}

enum SampleLine {
  Vera = 'Close the chapel.',
  Marcus = 'The bells were always mine.',
}

describe('beat-draft author voice fingerprints', () => {
  it('packs involved speakers into the author fingerprint block', () => {
    const block = authorVoiceFingerprintsBlock(
      [
        {
          name: 'Vera',
          voice: { ...EMPTY_VOICE_FINGERPRINT, register: 'clipped', sampleLines: [SampleLine.Vera] },
        },
        {
          name: 'Marcus',
          voice: { ...EMPTY_VOICE_FINGERPRINT, register: 'oily', sampleLines: [SampleLine.Marcus] },
        },
      ],
      ['Vera']
    )
    expect(block).toContain(BeatDraftVoiceHeading.Fingerprints)
    expect(block).toContain(SampleLine.Vera)
    expect(block).not.toContain(SampleLine.Marcus)
  })

  it('wires the packer into beat-draft author deps and keeps artifact-draft fingerprint-free', () => {
    const beatDraft = readFileSync(FingerprintSource.BeatDraftDeps, 'utf8')
    expect(beatDraft).toContain(FingerprintToken.PackHelper)
    const artifactDeps = readFileSync(FingerprintSource.ArtifactDeps, 'utf8')
    const artifactWorkflow = readFileSync(FingerprintSource.ArtifactWorkflow, 'utf8')
    expect(artifactDeps).not.toContain(FingerprintToken.PackHelper)
    expect(artifactDeps).not.toContain(FingerprintToken.PackInvolved)
    expect(artifactWorkflow).not.toContain(FingerprintToken.PackHelper)
    expect(artifactWorkflow).not.toContain(FingerprintToken.PackInvolved)
  })
})
