import { describe, expect, it } from 'vitest'
import { claimCheckBeat } from '@/domains/storyteller/core/claim-check'

describe('claimCheckBeat', () => {
  it('passes a cadence-only rewrite that keeps quotes and numbers', () => {
    const source =
      'Marcus said "hold the line" at 03:00 on 2024-07-14 with 12 rifles left.'
    const humanized =
      'Marcus muttered "hold the line" around 03:00 on 2024-07-14 with 12 rifles left.'
    const result = claimCheckBeat(source, humanized)
    expect(result.ok).toBe(true)
    expect(result.missing).toEqual([])
  })

  it('fails when a digit changes', () => {
    const source = 'She paid 40 silver.'
    const humanized = 'She paid 41 silver.'
    const result = claimCheckBeat(source, humanized)
    expect(result.ok).toBe(false)
    expect(result.missing.some(token => token.value === '40')).toBe(true)
  })

  it('fails when a quoted span changes', () => {
    const source = 'He whispered "the bells".'
    const humanized = 'He whispered "the drums".'
    const result = claimCheckBeat(source, humanized)
    expect(result.ok).toBe(false)
    expect(result.missing.some(token => token.value === 'the bells')).toBe(true)
  })

  it('passes Marcus→he when quotes and numbers stay', () => {
    const source = 'Marcus told her "wait" and left 2 coins on 2019-01-02.'
    const humanized = 'He told her "wait" and left 2 coins on 2019-01-02.'
    expect(claimCheckBeat(source, humanized).ok).toBe(true)
  })
})
