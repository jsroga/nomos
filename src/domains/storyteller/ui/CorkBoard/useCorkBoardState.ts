import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import { useConfirmDialog } from '@/components/ConfirmDialog'
import { BeatCard as BeatData, beatCardFromJson } from '@/domains/storyteller/core/types/story-types'
import {
  createEpisodeBeat,
  deleteBeat,
  fetchEpisodeBeatsList,
  patchBeat,
} from '@/domains/storyteller/core/io/storyteller.api'
import { StorytellerConfirmVariant } from '@/domains/storyteller/core/storyteller-page-wire'
import type { Message } from '@/shared/chat'
import {
  CORK_BOARD_DELETE_CANCEL,
  CORK_BOARD_DELETE_CONFIRM,
  CORK_BOARD_DELETE_DESCRIPTION,
  CORK_BOARD_DELETE_TITLE,
  CORK_BOARD_NEW_BEAT_LOGLINE,
  CORK_BOARD_NEW_BEAT_TYPE,
  CORK_BOARD_UNKNOWN_PROJECT,
} from './constants/cork-board'
import { resolveCorkBoardUrl } from './CorkBoardStoryboardSection'
import { runCorkBoardBeatGeneration } from './cork-board-generation'
import { useCorkBoardDragDrop } from './useCorkBoardDragDrop'

interface UseCorkBoardStateParams {
  initialBeats: BeatData[]
  episodeId?: string
  onAddMessage?: (message: Message) => void
  onSendMessage?: (message: string) => void
  propProjectId?: string
}

export const useCorkBoardState = ({
  initialBeats,
  episodeId,
  onAddMessage,
  onSendMessage,
  propProjectId,
}: UseCorkBoardStateParams) => {
  const [beats, setBeats] = useState<BeatData[]>(initialBeats)
  const [isGeneratingBeats, setIsGeneratingBeats] = useState(false)
  const [expandedBeatId, setExpandedBeatId] = useState<string | null>(null)
  const { confirm, ConfirmDialogComponent } = useConfirmDialog()
  const params = useParams<{ projectId: string }>()
  const projectId = propProjectId || params.projectId || CORK_BOARD_UNKNOWN_PROJECT
  const { onDragStart, onDragOver, onDrop } = useCorkBoardDragDrop(beats, setBeats)

  useEffect(() => {
    queueMicrotask(() => setBeats(initialBeats || []))
  }, [initialBeats])

  useEffect(() => {
    if (!episodeId) return
    fetchEpisodeBeatsList(episodeId).then(data => {
      if (Array.isArray(data)) {
        setBeats(
          data
            .map(row => beatCardFromJson(row))
            .filter(beat => Boolean(beat.id))
        )
      }
    })
  }, [episodeId])

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
      variant: StorytellerConfirmVariant.Destructive,
    })
    if (!confirmed) return
    setBeats(beats.filter(b => b.id !== id))
    await deleteBeat(id)
  }

  const handleGenerateBeats = () => {
    if (!projectId) return
    void runCorkBoardBeatGeneration({
      projectId,
      beats,
      onAddMessage,
      onSendMessage,
      setBeats,
      setIsGeneratingBeats,
    })
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
    handleGenerateBeats,
    handleNextBeat,
    handlePrevBeat,
    ConfirmDialogComponent,
  }
}
