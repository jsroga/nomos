import type { Dispatch, SetStateAction } from 'react'
import { BeatCard as BeatData } from '@/domains/storyteller/core/types/story-types'
import { beatImageService } from '@/domains/storyteller/services/beat-image-service'
import type { Message } from '@/shared/chat'
import {
  CORK_BOARD_COUNT_PLACEHOLDER,
  CORK_BOARD_GENERATE_BEATS_PROMPT,
  CORK_BOARD_STORYBOARD_FAILED_LOG,
  CORK_BOARD_STORYBOARD_STARTED_CONTENT,
  CORK_BOARD_VISUAL_DIRECTOR_SENDER,
} from './constants/cork-board'
import { StorytellerMessageType } from '@/domains/storyteller/core/storyteller-page-wire'

interface GenerateBeatImagesParams {
  projectId: string
  beats: BeatData[]
  onAddMessage?: (message: Message) => void
  onSendMessage?: (message: string) => void
  setBeats: Dispatch<SetStateAction<BeatData[]>>
  setIsGeneratingBeats: (value: boolean) => void
}

export const runCorkBoardBeatGeneration = async ({
  projectId,
  beats,
  onAddMessage,
  onSendMessage,
  setBeats,
  setIsGeneratingBeats,
}: GenerateBeatImagesParams): Promise<void> => {
  if (beats.length === 0) {
    onSendMessage?.(CORK_BOARD_GENERATE_BEATS_PROMPT)
    return
  }

  setIsGeneratingBeats(true)
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
      await beatImageService.generateImageForBeat(projectId, beat, (id, updates) => {
        setBeats(prev => prev.map(b => (b.id === id ? { ...b, ...updates } : b)))
      })
    }
  } catch (e) {
    console.error(CORK_BOARD_STORYBOARD_FAILED_LOG, e)
  } finally {
    setIsGeneratingBeats(false)
  }
}
