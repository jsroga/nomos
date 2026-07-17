import type { AsyncOperation } from '@/shared/jobs/useGlobalStatusStore'
import { UrlScheme } from '@/shared/data/constants/protocol'
import { readString } from '@/shared/data/json-guards'
import {
  moodboardGenOperationPrefix,
  MoodboardProvider,
} from '@/domains/storyteller/services/constants/moodboard-generation-service'

const MOODBOARD_INITIAL_SLOT_COUNT = 4
const PROGRESS_PERCENT_PATTERN = /(\d+)%/
const MOOD_IMAGE_FILE_PATTERN = /\.(png|jpg|jpeg|webp)$/i

export interface MoodboardGeneratingState {
  generatingIndices: Set<number>
  isGenerating: boolean
  progressDetails: string | undefined
  progressPercent: string | null
  isAddingNew: boolean
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

export function deriveMoodboardGeneratingState(
  operations: AsyncOperation[],
  projectId: string,
  moodImageCount: number
): MoodboardGeneratingState {
  const prefix = moodboardGenOperationPrefix(projectId)
  const activeOp = operations.find(op => op.id.startsWith(prefix))
  const progressDetails = activeOp?.details
  const generatingIndices = parseMoodboardGeneratingIndices(operations, projectId)
  const isGenerating = generatingIndices.size > 0
  const progressPercent = parseProgressPercent(progressDetails)
  const isAddingNew = Array.from(generatingIndices).some(idx => idx >= moodImageCount)

  return {
    generatingIndices,
    isGenerating,
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

export function hasMoodboardApiKey(
  config: Record<string, unknown>,
  legnextFromServer: boolean
): boolean {
  const provider = readString(config.provider) ?? ''
  const apiKey = readString(config.apiKey)
  return Boolean(
    apiKey || (provider === MoodboardProvider.Midjourney && legnextFromServer)
  )
}

export function clampProgressBarWidth(progressPercent: string | null): number {
  if (!progressPercent) {
    return 5
  }
  return Math.min(100, Math.max(0, Number(progressPercent)))
}
