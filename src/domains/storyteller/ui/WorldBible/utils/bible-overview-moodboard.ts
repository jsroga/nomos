import type { AsyncOperation } from '@/shared/jobs/useGlobalStatusStore'
import { UrlScheme } from '@/shared/data/constants/protocol'
import { moodboardGenOperationPrefix } from '@/domains/storyteller/services/constants/moodboard-generation-service'
import { BibleOverviewMoodboardCopy } from '../constants/bible-overview'

const MOODBOARD_INITIAL_SLOT_COUNT = 3
const PROGRESS_PERCENT_PATTERN = /(\d+)%/
const MOOD_IMAGE_FILE_PATTERN = /\.(png|jpg|jpeg|webp)$/i

export interface MoodboardGeneratingState {
  generatingIndices: Set<number>
  isGenerating: boolean
  isFullBoardGenerating: boolean
  progressDetails: string | undefined
  progressPercent: string | null
  isAddingNew: boolean
}

export function uniqueMoodImageUrls(urls: string[]): string[] {
  const seen = new Set<string>()
  const unique: string[] = []
  for (const url of urls) {
    if (!url || seen.has(url)) continue
    seen.add(url)
    unique.push(url)
  }
  return unique
}

export function collectMoodboardImages(
  localImages: unknown,
  savedImages: unknown,
  preferSaved = false,
): string[] {
  const local = Array.isArray(localImages)
    ? uniqueMoodImageUrls(localImages.filter((img): img is string => typeof img === 'string'))
    : []
  const saved = Array.isArray(savedImages)
    ? uniqueMoodImageUrls(savedImages.filter((img): img is string => typeof img === 'string'))
    : []
  if (preferSaved) {
    if (saved.length > 0) return saved
    return local
  }
  if (local.length > 0) return local
  return saved
}

export function moodboardImageClickHandler(
  onExpand: ((index: number) => void) | undefined,
  isLoading: boolean,
  index: number,
): (() => void) | undefined {
  if (!onExpand || isLoading) return undefined
  return () => onExpand(index)
}

export function parseProgressPercent(progressDetails?: string): string | null {
  const progressMatch = progressDetails?.match(PROGRESS_PERCENT_PATTERN)
  return progressMatch ? progressMatch[1] : null
}

export function parseMoodboardGeneratingIndices(
  operations: AsyncOperation[],
  projectId: string
): Set<number> {
  const generatingIndices = new Set<number>()
  const prefix = moodboardGenOperationPrefix(projectId)

  operations.forEach(op => {
    if (op.id === prefix) {
      for (let index = 0; index < MOODBOARD_INITIAL_SLOT_COUNT; index += 1) {
        generatingIndices.add(index)
      }
    } else if (op.id.startsWith(`${prefix}-`)) {
      const idx = parseInt(op.id.replace(`${prefix}-`, ''), 10)
      if (!Number.isNaN(idx)) {
        generatingIndices.add(idx)
      }
    }
  })

  return generatingIndices
}

export function isMoodboardGenerateBlocked(
  generatingIndices: Set<number>,
  isFullBoardGenerating: boolean,
  index: number,
): boolean {
  return isFullBoardGenerating || generatingIndices.has(index)
}

export function deriveMoodboardGeneratingState(
  operations: AsyncOperation[],
  projectId: string,
  moodImageCount: number
): MoodboardGeneratingState {
  const prefix = moodboardGenOperationPrefix(projectId)
  const activeOp = operations.find(op => op.id.startsWith(prefix))
  const progressDetails = activeOp?.details
  const generatingIndices = parseMoodboardGeneratingIndices(operations, projectId)
  const isFullBoardGenerating = operations.some(op => op.id === prefix)
  const isGenerating = generatingIndices.size > 0
  const progressPercent = parseProgressPercent(progressDetails)
  const isAddingNew = Array.from(generatingIndices).some(idx => idx >= moodImageCount)

  return {
    generatingIndices,
    isGenerating,
    isFullBoardGenerating,
    progressDetails,
    progressPercent,
    isAddingNew,
  }
}

export function resolveMoodboardImageUrl(imagePath: string, projectId: string): string | null {
  const isFile =
    MOOD_IMAGE_FILE_PATTERN.test(imagePath) || imagePath.startsWith(UrlScheme.Http)
  if (!isFile) {
    return null
  }
  return imagePath.startsWith(UrlScheme.Http) ? imagePath : `/projects/${projectId}/${imagePath}`
}

export function clampProgressBarWidth(progressPercent: string | null): number {
  if (!progressPercent) {
    return 5
  }
  return Math.min(100, Math.max(0, Number(progressPercent)))
}

export function moodboardImageAlt(index: number): string {
  return `${BibleOverviewMoodboardCopy.MoodImageAltPrefix} ${index + 1}`
}
