import { describe, expect, it } from 'vitest'
import { ThinkingLabel, describeThinkingProgress } from '../thinking-progress'

describe('describeThinkingProgress', () => {
  it('stays quiet while the turn still feels instant', () => {
    const progress = describeThinkingProgress(2_000)
    expect(progress.label).toBe(ThinkingLabel.Thinking)
    expect(progress.showSeconds).toBe(false)
  })

  it('escalates once the turn passes ten seconds', () => {
    const progress = describeThinkingProgress(12_000)
    expect(progress.label).toBe(ThinkingLabel.StillWorking)
    expect(progress.showSeconds).toBe(true)
    expect(progress.seconds).toBe(12)
  })

  it('explains the wait on a long reasoning turn', () => {
    const progress = describeThinkingProgress(57_800)
    expect(progress.label).toBe(ThinkingLabel.LongTurn)
    expect(progress.seconds).toBe(57)
  })

  it('never reports negative or non-finite elapsed time', () => {
    expect(describeThinkingProgress(-5).seconds).toBe(0)
    expect(describeThinkingProgress(Number.NaN).seconds).toBe(0)
  })
})
