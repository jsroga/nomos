import toast from 'react-hot-toast'
import { BeatCard as BeatData } from '@/domains/storyteller/core/types/story-types'
import { beatImageService } from '@/domains/storyteller/services/beat-image-service'
import { validatePremiseForBeatboard } from '@/domains/storyteller/core/utils/validate-premise-for-beatboard'
import type { Message } from '@/shared/chat'
import {
  CORK_BOARD_BEAT_IMAGES_FAILED_TOAST,
  CORK_BOARD_COUNT_PLACEHOLDER,
  CORK_BOARD_GENERATE_BEATS_PROMPT,
  CORK_BOARD_GENERATE_NEXT_BEAT_PROMPT,
  CORK_BOARD_STORYBOARD_FAILED_LOG,
  CORK_BOARD_STORYBOARD_STARTED_CONTENT,
  CORK_BOARD_VISUAL_DIRECTOR_SENDER,
  CorkBoardBeatImagePolicy,
  CorkBoardBeatListSep,
  CorkBoardCopy,
  CorkBoardExistingBeatsLabel,
  CorkBoardPromptPlaceholder,
} from './constants/cork-board'
import { StorytellerMessageType } from '@/domains/storyteller/core/storyteller-page-wire'
import { isGenerationActivityBusy } from '@/domains/storyteller/state/constants/storyteller-ui-store'
import { getBeatImageBatchStore } from '@/domains/storyteller/state/useBeatImageBatchStore'
import { getStorytellerUiStore } from '@/domains/storyteller/state/useStorytellerUiStore'
import { isConsistencyFixRunBusy } from '@/domains/storyteller/ui/FixInconsistencies/constants/fix-inconsistencies-dialog'

interface GenerateBeatImagesParams {
  projectId: string
  episodeId?: string
  beats: BeatData[]
  onAddMessage?: (message: Message) => void
  alreadyStarted?: boolean
}

export function isCorkBoardChatBlocked(): boolean {
  const store = getStorytellerUiStore()
  return (
    isGenerationActivityBusy(store.generationActivity.phase) ||
    isConsistencyFixRunBusy(store.consistencyFixRun.phase)
  )
}

function sendIfPremiseReady(
  premise: unknown,
  onSendMessage: ((message: string) => void) | undefined,
  message: string
): boolean {
  const result = validatePremiseForBeatboard(premise)
  if (!result.ok) {
    toast.error(result.message)
    return false
  }
  if (isCorkBoardChatBlocked()) {
    toast.error(CorkBoardCopy.WritersRoomBusy)
    return false
  }
  if (!onSendMessage) return false
  onSendMessage(message)
  return true
}

export function requestCorkBoardTextBeats(
  premise: unknown,
  onSendMessage?: (message: string) => void
): boolean {
  return sendIfPremiseReady(premise, onSendMessage, CORK_BOARD_GENERATE_BEATS_PROMPT)
}

export function corkBoardNextBeatPrompt(
  beats: ReadonlyArray<{ sequence: number; logline: string }>
): string {
  const existing =
    beats.length === 0
      ? CorkBoardExistingBeatsLabel.None
      : [...beats]
          .sort((left, right) => left.sequence - right.sequence)
          .map(beat => `${beat.sequence}${CorkBoardBeatListSep.Item}${beat.logline}`)
          .join(CorkBoardBeatListSep.Join)
  return CORK_BOARD_GENERATE_NEXT_BEAT_PROMPT.replace(
    CorkBoardPromptPlaceholder.Sequence,
    String(beats.length + 1)
  ).replace(CorkBoardPromptPlaceholder.Existing, existing)
}

export function preferRicherBeats<T extends { id: string }>(
  local: readonly T[],
  incoming: readonly T[]
): T[] {
  const localIds = new Set(local.map(beat => beat.id).filter(Boolean))
  const incomingIds = new Set(incoming.map(beat => beat.id).filter(Boolean))
  let incomingOnly = 0
  let localOnly = 0
  for (const id of incomingIds) {
    if (!localIds.has(id)) incomingOnly += 1
  }
  for (const id of localIds) {
    if (!incomingIds.has(id)) localOnly += 1
  }
  if (localOnly > incomingOnly) return [...local]
  if (incomingOnly > 0 || incoming.length >= local.length) return [...incoming]
  return [...local]
}

export function requestCorkBoardNextBeat(
  premise: unknown,
  beats: ReadonlyArray<{ sequence: number; logline: string }>,
  onSendMessage?: (message: string) => void
): boolean {
  return sendIfPremiseReady(premise, onSendMessage, corkBoardNextBeatPrompt(beats))
}

export function beatsHaveExistingImages(beats: ReadonlyArray<{ imageUrl?: string }>): boolean {
  return beats.some(beat => Boolean(beat.imageUrl))
}

export function beatsForImageGeneration<T extends { imageUrl?: string }>(
  beats: readonly T[],
  policy: CorkBoardBeatImagePolicy,
): T[] {
  if (policy === CorkBoardBeatImagePolicy.SkipExisting) {
    return beats.filter(beat => !beat.imageUrl)
  }
  return [...beats]
}

let corkBoardImageBatchSeq = 0

export function cancelCorkBoardBeatImageBatch(): string | null {
  corkBoardImageBatchSeq += 1
  const store = getBeatImageBatchStore()
  const runId = store.activeRunId
  store.cancel()
  return runId
}

export const runCorkBoardBeatImageGeneration = async ({
  projectId,
  episodeId,
  beats,
  onAddMessage,
  alreadyStarted = false,
}: GenerateBeatImagesParams): Promise<void> => {
  const seq = corkBoardImageBatchSeq + 1
  corkBoardImageBatchSeq = seq
  const batch = getBeatImageBatchStore()
  if (!alreadyStarted) {
    batch.start(
      episodeId ?? null,
      beats.map(beat => beat.id),
    )
  }
  onAddMessage?.({
    sender: CORK_BOARD_VISUAL_DIRECTOR_SENDER,
    content: CORK_BOARD_STORYBOARD_STARTED_CONTENT.replace(
      CORK_BOARD_COUNT_PLACEHOLDER,
      String(beats.length)
    ),
    type: StorytellerMessageType.Ai,
  })

  try {
    for (const beat of beats) {
      const live = getBeatImageBatchStore()
      if (seq !== corkBoardImageBatchSeq || live.cancelled) break
      live.setActiveBeat(beat.id)
      await beatImageService.generateImageForBeat(
        projectId,
        beat,
        (id, updates) => {
          getBeatImageBatchStore().applyPatch(id, {
            imageUrl: updates.imageUrl,
            imagePrompt: updates.imagePrompt,
          })
        },
        {
          shouldAbort: () => seq !== corkBoardImageBatchSeq || getBeatImageBatchStore().cancelled,
          onRunStarted: handleId => getBeatImageBatchStore().setActiveRun(handleId),
        },
      )
      getBeatImageBatchStore().markDone(beat.id)
    }
  } catch (e) {
    console.error(CORK_BOARD_STORYBOARD_FAILED_LOG, e)
    toast.error(
      e instanceof Error && e.message.trim().length > 0
        ? e.message
        : CORK_BOARD_BEAT_IMAGES_FAILED_TOAST
    )
  } finally {
    if (seq === corkBoardImageBatchSeq) {
      const live = getBeatImageBatchStore()
      if (live.cancelled) toast(CorkBoardCopy.ImagesCancelled)
      live.clear()
    }
  }
}
