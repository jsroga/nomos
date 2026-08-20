import { VideoFileExtension } from '@/shared/data/constants/protocol'
import { CorkBoardCopy, CorkBoardExpandedId } from './constants/cork-board'

const STORYBOARD_VIDEO_URL_BASE = 'https://local.invalid'

export function isStoryboardVideoUrl(url: string | null | undefined): boolean {
  if (!url) return false
  try {
    const parsed = new URL(url, STORYBOARD_VIDEO_URL_BASE)
    return parsed.pathname.toLowerCase().endsWith(VideoFileExtension.Mp4)
  } catch {
    return false
  }
}

export function isStoryboardStillLightboxOpen(
  expandedBeatId: string | null | undefined,
  storyboardUrl: string | null | undefined,
): boolean {
  return (
    expandedBeatId === CorkBoardExpandedId.StoryboardView && !isStoryboardVideoUrl(storyboardUrl)
  )
}

export function storyboardEmptyCopy(input: {
  hasBeats: boolean
  hasBeatImages: boolean
}): CorkBoardCopy {
  if (!input.hasBeats) return CorkBoardCopy.CombinedNeedBeats
  if (!input.hasBeatImages) return CorkBoardCopy.CombinedNeedImages
  return CorkBoardCopy.CombinedEmpty
}
