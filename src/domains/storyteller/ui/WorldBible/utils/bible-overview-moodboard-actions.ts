import toast from 'react-hot-toast'
import { readString } from '@/shared/data/json-guards'
import { moodboardGenerationService } from '@/domains/storyteller/services/moodboard-generation-service'
import { patchStorytellerProject } from '@/domains/storyteller/core/io/storyteller.api'
import { BibleOverviewToast } from '../constants/bible-overview'
import { hasMoodboardApiKey } from './bible-overview-moodboard'

function reportMissingApiKey(config: Record<string, unknown>) {
  const provider = readString(config.provider) ?? BibleOverviewToast.UnknownProvider
  toast.error(
    `${BibleOverviewToast.MissingApiKeyPrefix}${provider}${BibleOverviewToast.MissingApiKeySuffix}`
  )
}

export async function regenerateMoodboardImage(input: {
  projectId: string | undefined
  isGenerating: boolean
  config: Record<string, unknown>
  legnextFromServer: boolean
  promptIndex: number
  onRefetchMoodboardData: () => Promise<void>
}) {
  if (input.isGenerating || !input.projectId) {
    return
  }
  if (!hasMoodboardApiKey(input.config, input.legnextFromServer)) {
    reportMissingApiKey(input.config)
    return
  }
  try {
    await moodboardGenerationService.generate(
      input.projectId,
      [],
      undefined,
      input.config,
      input.onRefetchMoodboardData,
      input.promptIndex
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
  config: Record<string, unknown>
  legnextFromServer: boolean
  nextIndex: number
  onRefetchMoodboardData: () => Promise<void>
}) {
  if (input.isGenerating || !input.projectId) {
    return
  }
  if (!hasMoodboardApiKey(input.config, input.legnextFromServer)) {
    reportMissingApiKey(input.config)
    return
  }
  try {
    await moodboardGenerationService.generate(
      input.projectId,
      [],
      undefined,
      input.config,
      input.onRefetchMoodboardData,
      input.nextIndex
    )
    toast.success(BibleOverviewToast.NewImageGenerating)
  } catch (err) {
    console.error(err)
    toast.error(BibleOverviewToast.GenerationError)
  }
}

export async function generateInitialMoodboard(input: {
  projectId: string | undefined
  isGenerating: boolean
  hasWorldDescription: boolean
  config: Record<string, unknown>
  legnextFromServer: boolean
  onRefetchMoodboardData: () => Promise<void>
}) {
  if (input.isGenerating) {
    return
  }
  if (!input.hasWorldDescription) {
    toast.error(BibleOverviewToast.WorldDescriptionRequired)
    return
  }
  if (!input.projectId) {
    return
  }
  if (!hasMoodboardApiKey(input.config, input.legnextFromServer)) {
    reportMissingApiKey(input.config)
    return
  }
  try {
    await moodboardGenerationService.generate(
      input.projectId,
      [],
      undefined,
      input.config,
      input.onRefetchMoodboardData
    )
    toast.success(BibleOverviewToast.InitialMoodboardGenerating)
  } catch (err) {
    console.error(err)
    toast.error(BibleOverviewToast.GenerationError)
  }
}
