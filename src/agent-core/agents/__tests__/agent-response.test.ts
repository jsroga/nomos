import { describe, it, expect } from 'vitest'
import { extractThinking, truncateForTrace, TRACE_PREVIEW_CHARS } from '../agent-response'

describe('extractThinking', () => {
  it('reads reasoning first', () => {
    expect(extractThinking({ reasoning: 'a', thinking: 'b' })).toBe('a')
  })

  it('falls back to thinking', () => {
    expect(extractThinking({ thinking: 'b' })).toBe('b')
  })

  it('falls back to steps[0].thinking', () => {
    expect(extractThinking({ steps: [{ thinking: 'c' }] })).toBe('c')
  })

  it('returns undefined when absent or empty', () => {
    expect(extractThinking({})).toBeUndefined()
    expect(extractThinking({ reasoning: '' })).toBeUndefined()
    expect(extractThinking(null)).toBeUndefined()
    expect(extractThinking({ reasoning: 123 })).toBeUndefined()
  })
})

describe('truncateForTrace', () => {
  it('returns short text unchanged', () => {
    expect(truncateForTrace('hello')).toBe('hello')
  })

  it('truncates to the default limit', () => {
    const long = 'x'.repeat(TRACE_PREVIEW_CHARS + 50)
    expect(truncateForTrace(long)).toHaveLength(TRACE_PREVIEW_CHARS)
  })

  it('respects a custom limit', () => {
    expect(truncateForTrace('abcdef', 3)).toBe('abc')
  })

  it('handles empty input', () => {
    expect(truncateForTrace('')).toBe('')
  })
})
