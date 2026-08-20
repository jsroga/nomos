import toast from 'react-hot-toast'
import { LocalStorageKeys } from '@/shared/data/constants/localStorage'
import { browserStorage } from '@/shared/data/browser-storage'
import { POLLING_INTERVALS } from '@/shared/data/constants/polling'
import {
  TriggerRunPollAbortedError,
  waitForTriggerRun,
} from '@/shared/data/polling/wait-for-trigger-run'
import { ClientFetchError } from '@/shared/data/fetch-json-record'
import {
  fetchCharacterPortraitRunStatus,
  startCharacterPortraitGeneration,
} from '@/domains/storyteller/core/io/character.api'
import { recordFromJson, readString } from '@/shared/data/json-guards'
import {
  CHARACTER_DIALOG_ERROR_GENERATE_PORTRAIT,
  CHARACTER_DIALOG_ERROR_NO_HANDLE,
  CHARACTER_DIALOG_LOG_POLL_CANCELLED,
  CHARACTER_DIALOG_NEW_ID,
  CHARACTER_DIALOG_TOAST_PORTRAIT_FAILED,
} from './constants/character-creation-dialog'
import type { PortraitGenState } from './character-creation-dialog-types'
import {
  bindPortraitGenerationRun,
  clearPortraitGeneration,
  trackPortraitGenerationStart,
} from './character-portrait-operation'

export type UpdatePortraitGenState = (
  charId: string,
  updates: Partial<PortraitGenState>,
) => void

const PORTRAIT_MAX_POLLS = 60

export function portraitGenCompleteUpdates(
  imageUrl: string,
  isVariantGrid: boolean,
): Partial<PortraitGenState> {
  return {
    isGenerating: false,
    gridImageUrl: isVariantGrid ? imageUrl : null,
    needsVariantPick: isVariantGrid,
    portraitUrlOverride: imageUrl,
    completedPortraitUrl: imageUrl,
  }
}

function applyCompletedPortrait(input: {
  targetCharId: string
  imageUrl: string
  isVariantGrid: boolean
  updateGenState: UpdatePortraitGenState
  onPortraitReady?: (characterId: string, portraitUrl: string) => void
}): void {
  input.updateGenState(
    input.targetCharId,
    portraitGenCompleteUpdates(input.imageUrl, input.isVariantGrid),
  )
  if (input.targetCharId === CHARACTER_DIALOG_NEW_ID) return
  input.onPortraitReady?.(input.targetCharId, input.imageUrl)
}

export async function runCharacterPortraitGeneration(input: {
  description: string
  projectId: string | undefined
  targetCharId: string
  mbti: string
  motivation: string
  currentGenId: number
  generationIds: Record<string, number>
  updateGenState: UpdatePortraitGenState
  onPortraitReady?: (characterId: string, portraitUrl: string) => void
}): Promise<void> {
  const { targetCharId, updateGenState } = input

  if (!input.projectId) {
    updateGenState(targetCharId, { isGenerating: false })
    return
  }

  const opId = trackPortraitGenerationStart(targetCharId)

  try {
    const apiKey =
      browserStorage.getAiApiKey(LocalStorageKeys.AI_CONFIG_APIFRAME) || undefined
    const { handleId } = await startCharacterPortraitGeneration({
      description: input.description,
      projectId: input.projectId,
      ...(targetCharId !== CHARACTER_DIALOG_NEW_ID ? { characterId: targetCharId } : {}),
      ...(input.mbti.trim() ? { mbti: input.mbti.trim() } : {}),
      ...(input.motivation.trim() ? { motivation: input.motivation.trim() } : {}),
      ...(apiKey ? { apiKey } : {}),
    })

    if (!handleId) {
      console.error(CHARACTER_DIALOG_ERROR_NO_HANDLE)
      updateGenState(targetCharId, { isGenerating: false })
      toast.error(CHARACTER_DIALOG_TOAST_PORTRAIT_FAILED)
      return
    }

    bindPortraitGenerationRun(opId, handleId)

    const run = await waitForTriggerRun(
      async () => {
        const status = await fetchCharacterPortraitRunStatus(handleId)
        return {
          status: status.status,
          output: status.imageUrl ? { imageUrl: status.imageUrl } : {},
          error: status.error,
        }
      },
      {
        intervalMs: POLLING_INTERVALS.DEFAULT,
        maxPolls: PORTRAIT_MAX_POLLS,
        shouldAbort: () => input.currentGenId !== input.generationIds[targetCharId],
      },
    )

    const imageUrl = readString(recordFromJson(run.output).imageUrl)
    const isVariantGrid = recordFromJson(run.output).isVariantGrid === true
    if (imageUrl) {
      applyCompletedPortrait({
        targetCharId,
        imageUrl,
        isVariantGrid,
        updateGenState,
        onPortraitReady: input.onPortraitReady,
      })
      return
    }

    updateGenState(targetCharId, { isGenerating: false })
    toast.error(CHARACTER_DIALOG_TOAST_PORTRAIT_FAILED)
  } catch (error: unknown) {
    if (error instanceof TriggerRunPollAbortedError) {
      console.log(CHARACTER_DIALOG_LOG_POLL_CANCELLED, targetCharId)
      return
    }
    if (!(error instanceof ClientFetchError)) {
      console.error(CHARACTER_DIALOG_ERROR_GENERATE_PORTRAIT, error)
    }
    updateGenState(targetCharId, { isGenerating: false })
    toast.error(
      error instanceof Error && error.message.trim().length > 0
        ? error.message
        : CHARACTER_DIALOG_TOAST_PORTRAIT_FAILED,
    )
  } finally {
    clearPortraitGeneration(opId)
  }
}
