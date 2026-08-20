import toast from 'react-hot-toast'
import { moodboardGenerationService } from '@/domains/storyteller/services/moodboard-generation-service'
import { patchStorytellerProject } from '@/domains/storyteller/core/io/storyteller.api'
import { BibleOverviewToast } from '../constants/bible-overview'

function reportMoodboardPollFailure(error: unknown): void {
  if (error instanceof Error && error.message.trim().length > 0) {
    toast.error(error.message)
    return
  }
  toast.error(BibleOverviewToast.GenerationFailed)
}

function assertMoodboardOverviewReady(hasOverviewContext: boolean): boolean {
  if (hasOverviewContext) return true
  toast.error(BibleOverviewToast.OverviewRequired)
  return false
}

export async function regenerateMoodboardImage(input: {
  projectId: string | undefined
  isGenerating: boolean
  hasOverviewContext: boolean
  config: Record<string, unknown>
  promptIndex: number
  onRefetchMoodboardData: () => Promise<void>
}) {
  if (input.isGenerating || !input.projectId) {
    return
  }
  if (!assertMoodboardOverviewReady(input.hasOverviewContext)) {
    return
  }
  try {
    await moodboardGenerationService.generate(
      input.projectId,
      [],
      input.config,
      input.onRefetchMoodboardData,
      input.promptIndex,
      reportMoodboardPollFailure,
    )
  } catch (err) {
    console.error(err)
    toast.error(BibleOverviewToast.RegenerationError)
  }
}

export async function removeMoodboardImage(input: {
  projectId: string | undefined
  isGenerating: boolean
  displayMoodImages: string[]
  imageIndex: number
  confirmDelete: () => Promise<boolean>
  onRefetchMoodboardData: () => Promise<void>
}) {
  if (input.isGenerating || !input.projectId) {
    return
  }
  const confirmed = await input.confirmDelete()
  if (!confirmed) {
    return
  }
  try {
    const updatedImages = input.displayMoodImages.filter((_, idx) => idx !== input.imageIndex)
    await patchStorytellerProject(input.projectId, {
      seriesBible: { moodImages: updatedImages },
    })
    await input.onRefetchMoodboardData()
    toast.success(BibleOverviewToast.ImageRemoved)
  } catch (err) {
    console.error(err)
    toast.error(BibleOverviewToast.RemoveImageError)
  }
}

export async function addMoodboardImage(input: {
  projectId: string | undefined
  isGenerating: boolean
  hasOverviewContext: boolean
  config: Record<string, unknown>
  nextIndex: number
  onRefetchMoodboardData: () => Promise<void>
}) {
  if (input.isGenerating || !input.projectId) {
    return
  }
  if (!assertMoodboardOverviewReady(input.hasOverviewContext)) {
    return
  }
  try {
    const handleId = await moodboardGenerationService.generate(
      input.projectId,
      [],
      input.config,
      input.onRefetchMoodboardData,
      input.nextIndex,
      reportMoodboardPollFailure,
    )
    if (handleId) {
      toast.success(BibleOverviewToast.NewImageGenerating)
    }
  } catch (err) {
    console.error(err)
    toast.error(BibleOverviewToast.GenerationError)
  }
}

export async function generateInitialMoodboard(input: {
  projectId: string | undefined
  isGenerating: boolean
  hasOverviewContext: boolean
  config: Record<string, unknown>
  onRefetchMoodboardData: () => Promise<void>
}) {
  if (input.isGenerating) {
    return
  }
  if (!assertMoodboardOverviewReady(input.hasOverviewContext)) {
    return
  }
  if (!input.projectId) {
    return
  }
  try {
    const handleId = await moodboardGenerationService.generate(
      input.projectId,
      [],
      input.config,
      input.onRefetchMoodboardData,
      undefined,
      reportMoodboardPollFailure,
    )
    if (handleId) {
      toast.success(BibleOverviewToast.InitialMoodboardGenerating)
    }
  } catch (err) {
    console.error(err)
    toast.error(BibleOverviewToast.GenerationError)
  }
}
