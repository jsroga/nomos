import { describe, expect, it } from 'vitest'
import { voiceFingerprintFromUnknown } from '../voice-fingerprint'

describe('voiceFingerprintFromUnknown', () => {
  it('maps a legacy voice string onto register', () => {
    const fingerprint = voiceFingerprintFromUnknown('dry, clipped, never asks')
    expect(fingerprint.register).toBe('dry, clipped, never asks')
    expect(fingerprint.favouredLexicon).toEqual([])
    expect(fingerprint.sampleLines).toEqual([])
  })
})
