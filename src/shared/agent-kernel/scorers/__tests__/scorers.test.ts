import { describe, expect, it } from 'vitest'
import { consistencyScorer } from '../consistency-scorer'
import { inputRecord, normalizeScore, outputToString } from '../shared'

describe('eval scorers shared', () => {
  it('normalizes scores to 0-1', () => {
    expect(normalizeScore(1.5)).toBe(1)
    expect(normalizeScore(-0.2)).toBe(0)
    expect(normalizeScore(0.5)).toBe(0.5)
  })

  it('stringifies output objects with response field', () => {
    expect(outputToString({ response: 'hello' })).toBe('hello')
    expect(outputToString('plain')).toBe('plain')
  })

  it('wraps non-object input', () => {
    expect(inputRecord('x')).toEqual({ value: 'x' })
  })
})

describe('consistencyScorer', () => {
  it('flags alive vs dead contradiction', async () => {
    const result = await consistencyScorer.run({
      input: { facts: ['Character is dead'] },
      output: 'The character is still alive and walking.',
    })
    expect(result.score).toBe(0)
    expect(result.reason).toContain('violations')
  })

  it('passes when no contradiction', async () => {
    const result = await consistencyScorer.run({
      input: { facts: ['Character is dead'] },
      output: 'The character remains dead.',
    })
    expect(result.score).toBe(1)
  })
})
