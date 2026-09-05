import { describe, expect, it } from 'vitest'
import { EMPTY_VOICE_FINGERPRINT } from '../voice-fingerprint'
import { packInvolvedVoiceFingerprints } from '../pack-involved-voice-fingerprints'

const VERA_SAMPLE = 'Close the chapel. Now.'
const MARCUS_SAMPLE = 'The bells were always mine.'

const CAST = [
  {
    name: 'Vera',
    voice: { ...EMPTY_VOICE_FINGERPRINT, register: 'clipped', sampleLines: [VERA_SAMPLE] },
  },
  {
    name: 'Marcus',
    voice: { ...EMPTY_VOICE_FINGERPRINT, register: 'oily', sampleLines: [MARCUS_SAMPLE] },
  },
]

describe('packInvolvedVoiceFingerprints', () => {
  it('omits fingerprints for cast not in charactersInvolved', () => {
    const packed = packInvolvedVoiceFingerprints(CAST, ['Vera'])
    expect(packed).toContain(VERA_SAMPLE)
    expect(packed).not.toContain(MARCUS_SAMPLE)
    expect(packed).not.toContain('Marcus')
  })
})
