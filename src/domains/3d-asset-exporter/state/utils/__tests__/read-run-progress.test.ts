import { describe, expect, it } from 'vitest'
import { ThreeDRunMetadataKey } from '../../../constants/three-d-polling'
import { readProgressPercent, readRunProgress } from '../read-run-progress'

describe('readProgressPercent', () => {
  it('returns a clamped integer for a finite number', () => {
    expect(readProgressPercent(37.4)).toBe(37)
    expect(readProgressPercent(-4)).toBe(0)
    expect(readProgressPercent(140)).toBe(100)
  })

  it('parses a numeric string', () => {
    expect(readProgressPercent('42')).toBe(42)
  })

  it('returns undefined for non-numeric values', () => {
    expect(readProgressPercent(undefined)).toBeUndefined()
    expect(readProgressPercent('')).toBeUndefined()
    expect(readProgressPercent('pending')).toBeUndefined()
  })
})

describe('readRunProgress', () => {
  it('reads progress from Trigger run metadata', () => {
    expect(readRunProgress({ [ThreeDRunMetadataKey.Progress]: 18 })).toBe(18)
    expect(readRunProgress({ [ThreeDRunMetadataKey.Progress]: '55' })).toBe(55)
  })

  it('returns undefined when progress is missing', () => {
    expect(readRunProgress(undefined)).toBeUndefined()
    expect(readRunProgress({})).toBeUndefined()
  })
})
