import { describe, expect, it } from 'vitest'
import {
  formatMoodboardGeneratingCopy,
  MoodboardOperationDetail,
} from '../moodboard-generation-service'

describe('formatMoodboardGeneratingCopy', () => {
  it('uses Generating… when progress is missing or zero', () => {
    expect(formatMoodboardGeneratingCopy(undefined)).toBe(MoodboardOperationDetail.Generating)
    expect(formatMoodboardGeneratingCopy(0)).toBe(MoodboardOperationDetail.Generating)
  })

  it('includes a percent when progress is underway', () => {
    expect(formatMoodboardGeneratingCopy(20)).toBe(
      `${MoodboardOperationDetail.GeneratingOpen}20${MoodboardOperationDetail.GeneratingClose}`,
    )
  })

  it('never uses trigger stage names', () => {
    expect(formatMoodboardGeneratingCopy(undefined)).toBe(MoodboardOperationDetail.Generating)
    expect(formatMoodboardGeneratingCopy('waiting_diffusion')).toBe(MoodboardOperationDetail.Generating)
  })
})
