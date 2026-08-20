import { describe, expect, it } from 'vitest'
import { FalSamPrompt, resolveSamPrompt } from '../constants/fal'

describe('resolveSamPrompt', () => {
  it('uses the typed prompt when present', () => {
    expect(resolveSamPrompt('building')).toBe('building')
    expect(resolveSamPrompt('  car  ')).toBe('car')
  })

  it('defaults to object so SAM-3 does not search for a wheel', () => {
    expect(resolveSamPrompt()).toBe(FalSamPrompt.Object)
    expect(resolveSamPrompt('')).toBe(FalSamPrompt.Object)
    expect(resolveSamPrompt('   ')).toBe(FalSamPrompt.Object)
  })
})
