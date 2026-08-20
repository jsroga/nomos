import { describe, expect, it } from 'vitest'
import { CorkBoardCopy, CorkBoardExpandedId } from '../constants/cork-board'
import {
  isStoryboardStillLightboxOpen,
  isStoryboardVideoUrl,
  storyboardEmptyCopy,
} from '../storyboard-media'

describe('storyboard media', () => {
  it('treats mp4 URLs as video including query strings', () => {
    expect(isStoryboardVideoUrl('https://blob.example/storyboard_video_1.mp4')).toBe(true)
    expect(
      isStoryboardVideoUrl('https://blob.example/storyboard_video_1.mp4?download=1'),
    ).toBe(true)
    expect(isStoryboardVideoUrl('/projects/abc/storyboard_video_1.mp4')).toBe(true)
  })

  it('treats png storyboard URLs as stills', () => {
    expect(isStoryboardVideoUrl('https://blob.example/combined_storyboard.png')).toBe(false)
    expect(isStoryboardVideoUrl(null)).toBe(false)
  })

  it('picks empty-state copy from beats and images', () => {
    expect(storyboardEmptyCopy({ hasBeats: false, hasBeatImages: false })).toBe(
      CorkBoardCopy.CombinedNeedBeats,
    )
    expect(storyboardEmptyCopy({ hasBeats: true, hasBeatImages: false })).toBe(
      CorkBoardCopy.CombinedNeedImages,
    )
    expect(storyboardEmptyCopy({ hasBeats: true, hasBeatImages: true })).toBe(
      CorkBoardCopy.CombinedEmpty,
    )
  })

  it('opens the still lightbox only for non-video storyboard URLs', () => {
    expect(
      isStoryboardStillLightboxOpen(
        CorkBoardExpandedId.StoryboardView,
        'https://blob.example/sheet.png',
      ),
    ).toBe(true)
    expect(
      isStoryboardStillLightboxOpen(
        CorkBoardExpandedId.StoryboardView,
        'https://blob.example/story.mp4',
      ),
    ).toBe(false)
  })
})
