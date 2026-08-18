import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import toast from 'react-hot-toast'
import { useConfirmDialog } from '@/components/ConfirmDialog'
import { ConfirmDialogChoice, ConfirmDialogVariant } from '@/components/ConfirmDialog/constants/confirm-dialog-copy'
import { BeatCard as BeatData, beatCardFromJson } from '@/domains/storyteller/core/types/story-types'
import { validatePremiseForBeatboard } from '@/domains/storyteller/core/utils/validate-premise-for-beatboard'
import {
  createEpisodeBeat,
  deleteBeat,
  fetchEpisodeBeatsList,
  patchBeat,
} from '@/domains/storyteller/core/io/storyteller.api'
import type { Message } from '@/shared/chat'
import {
  CORK_BOARD_DELETE_CANCEL,
  CORK_BOARD_DELETE_CONFIRM,
  CORK_BOARD_DELETE_DESCRIPTION,
  CORK_BOARD_DELETE_TITLE,
  CORK_BOARD_GENERATE_BEATS_PROMPT,
  CORK_BOARD_IMAGES_CANCEL,
  CORK_BOARD_NEW_BEAT_LOGLINE,
  CORK_BOARD_NEW_BEAT_TYPE,
  CORK_BOARD_UNKNOWN_PROJECT,
  CorkBoardBeatImagePolicy,
  CorkBoardCopy,
} from './constants/cork-board'
import { resolveCorkBoardUrl } from './CorkBoardStoryboardSection'
import { getStorytellerUiStore } from '@/domains/storyteller/state/useStorytellerUiStore'
import {
  beatsForImageGeneration,
  beatsHaveExistingImages,
  preferRicherBeats,
  requestCorkBoardNextBeat,
  runCorkBoardBeatImageGeneration,
} from './cork-board-generation'
import { useCorkBoardDragDrop } from './useCorkBoardDragDrop'
import {
  applyBeatImagePatches,
  getBeatImageBatchStore,
  isBeatImageBatchBusy,
  useBeatImageBatchStore,
} from '@/domains/storyteller/state/useBeatImageBatchStore'

function beatsFromListPayload(data: unknown): BeatData[] {
  if (!Array.isArray(data)) return []
  return data.map(row => beatCardFromJson(row)).filter(beat => Boolean(beat.id))
}

interface UseCorkBoardStateParams {
  initialBeats: BeatData[]
  episodeId?: string
  onAddMessage?: (message: Message) => void
  onSendMessage?: (message: string) => void
  onRefreshBeats?: () => void
  premise?: unknown
  isChatBusy?: boolean
  propProjectId?: string
}

export const useCorkBoardState = ({
  initialBeats,
  episodeId,
  onAddMessage,
  onSendMessage,
  onRefreshBeats,
  premise,
  isChatBusy = false,
  propProjectId,
}: UseCorkBoardStateParams) => {
  const [beats, setBeats] = useState<BeatData[]>(initialBeats)
  const [awaitingBoardRefresh, setAwaitingBoardRefresh] = useState(false)
  const [expandedBeatId, setExpandedBeatId] = useState<string | null>(null)
  const { confirm, choose, ConfirmDialogComponent } = useConfirmDialog()
  const params = useParams<{ projectId: string }>()
  const imagePatches = useBeatImageBatchStore(state => state.patches)
  const pendingImageBeatIds = useBeatImageBatchStore(state => state.pendingBeatIds)
  const batchEpisodeId = useBeatImageBatchStore(state => state.episodeId)
  const isGeneratingBeats =
    isBeatImageBatchBusy(pendingImageBeatIds) &&
    (batchEpisodeId === null || batchEpisodeId === episodeId)
  const projectId = propProjectId || params.projectId || CORK_BOARD_UNKNOWN_PROJECT
  const { onDragStart, onDragOver, onDrop } = useCorkBoardDragDrop(beats, setBeats)

  useEffect(() => {
    queueMicrotask(() => {
      setBeats(prev =>
        applyBeatImagePatches(preferRicherBeats(prev, initialBeats || []), getBeatImageBatchStore().patches)
      )
    })
  }, [initialBeats])

  useEffect(() => {
    queueMicrotask(() => {
      setBeats(prev => applyBeatImagePatches(prev, imagePatches))
    })
  }, [imagePatches])

  useEffect(() => {
    if (isChatBusy || !episodeId) return
    if (awaitingBoardRefresh) {
      queueMicrotask(() => setAwaitingBoardRefresh(false))
      onRefreshBeats?.()
    }
    fetchEpisodeBeatsList(episodeId).then(data => {
      setBeats(prev =>
        applyBeatImagePatches(
          preferRicherBeats(prev, beatsFromListPayload(data)),
          getBeatImageBatchStore().patches,
        ),
      )
    })
  }, [isChatBusy, awaitingBoardRefresh, episodeId, onRefreshBeats])

  const expandedBeatIndex = beats.findIndex(b => b.id === expandedBeatId)
  const expandedBeat = expandedBeatIndex !== -1 ? beats[expandedBeatIndex] : null
  const getUrl = (url: string | null) => resolveCorkBoardUrl(url, projectId)

  const handleCreate = async () => {
    if (!episodeId) return
    const created = await createEpisodeBeat(episodeId, {
      logline: CORK_BOARD_NEW_BEAT_LOGLINE,
      beatType: CORK_BOARD_NEW_BEAT_TYPE,
      sequence: beats.length + 1,
      content: '',
    })
    setBeats([...beats, beatCardFromJson(created)])
  }

  const handleUpdate = async (id: string, updates: Partial<BeatData>) => {
    setBeats(beats.map(b => (b.id === id ? { ...b, ...updates } : b)))
    await patchBeat(id, updates)
  }

  const handleDelete = async (id: string) => {
    const confirmed = await confirm({
      title: CORK_BOARD_DELETE_TITLE,
      description: CORK_BOARD_DELETE_DESCRIPTION,
      confirmLabel: CORK_BOARD_DELETE_CONFIRM,
      cancelLabel: CORK_BOARD_DELETE_CANCEL,
      variant: ConfirmDialogVariant.Destructive,
    })
    if (!confirmed) return
    setBeats(beats.filter(b => b.id !== id))
    await deleteBeat(id)
  }

  const handleGenerateTextBeats = async () => {
    const result = validatePremiseForBeatboard(premise)
    if (!result.ok) {
      toast.error(result.message)
      return
    }
    if (beats.length > 0) {
      const confirmed = await confirm({
        title: CorkBoardCopy.ReplaceTitle,
        description: CorkBoardCopy.ReplaceDescription,
        confirmLabel: CorkBoardCopy.ReplaceConfirm,
        cancelLabel: CorkBoardCopy.ReplaceCancel,
        variant: ConfirmDialogVariant.Destructive,
      })
      if (!confirmed) return
      await Promise.all(beats.map(beat => deleteBeat(beat.id)))
      setBeats([])
    }
    onSendMessage?.(CORK_BOARD_GENERATE_BEATS_PROMPT)
    getStorytellerUiStore().clearPendingBeatAdds(false)
    setAwaitingBoardRefresh(true)
  }

  const handleGenerateNextBeat = () => {
    if (!requestCorkBoardNextBeat(premise, beats, onSendMessage)) return
    setAwaitingBoardRefresh(true)
  }

  const handleGenerateImages = async () => {
    if (!projectId || beats.length === 0) return
    let policy = CorkBoardBeatImagePolicy.Override
    if (beatsHaveExistingImages(beats)) {
      const choice = await choose({
        title: CorkBoardCopy.ImagesExistTitle,
        description: CorkBoardCopy.ImagesExistDescription,
        confirmLabel: CorkBoardCopy.ImagesOverride,
        secondaryLabel: CorkBoardCopy.ImagesSkip,
        cancelLabel: CORK_BOARD_IMAGES_CANCEL,
      })
      if (choice === ConfirmDialogChoice.Dismissed) return
      policy =
        choice === ConfirmDialogChoice.Secondary
          ? CorkBoardBeatImagePolicy.SkipExisting
          : CorkBoardBeatImagePolicy.Override
    }
    const targets = beatsForImageGeneration(beats, policy)
    if (targets.length === 0) {
      toast.error(CorkBoardCopy.AllImagesExist)
      return
    }
    void runCorkBoardBeatImageGeneration({
      projectId,
      episodeId,
      beats: targets,
      onAddMessage,
    })
  }

  const handleCancelImages = () => {
    getBeatImageBatchStore().cancel()
  }

  const handleNextBeat = () => {
    if (expandedBeatIndex !== -1 && expandedBeatIndex < beats.length - 1) {
      setExpandedBeatId(beats[expandedBeatIndex + 1].id)
    }
  }

  const handlePrevBeat = () => {
    if (expandedBeatIndex > 0) {
      setExpandedBeatId(beats[expandedBeatIndex - 1].id)
    }
  }

  return {
    beats,
    projectId,
    isGeneratingBeats,
    pendingImageBeatIds,
    isChatBusy,
    expandedBeatId,
    setExpandedBeatId,
    expandedBeat,
    expandedBeatIndex,
    getUrl,
    onDragStart,
    onDragOver,
    onDrop,
    handleCreate,
    handleUpdate,
    handleDelete,
    handleGenerateTextBeats,
    handleGenerateNextBeat,
    handleGenerateImages,
    handleCancelImages,
    handleNextBeat,
    handlePrevBeat,
    ConfirmDialogComponent,
  }
}
