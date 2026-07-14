import { BeatCardType } from '@/domains/storyteller/ui/BeatCard/constants/beat-card'

/** Cork board UI copy and agent prompts. */

export const CORK_BOARD_UNKNOWN_PROJECT = 'unknown'
export const CORK_BOARD_NEW_BEAT_LOGLINE = 'New Beat'
export const CORK_BOARD_NEW_BEAT_TYPE = BeatCardType.Setup

export const CORK_BOARD_DELETE_TITLE = 'Delete Beat'
export const CORK_BOARD_DELETE_DESCRIPTION = 'Are you sure you want to delete this beat?'
export const CORK_BOARD_DELETE_CONFIRM = 'Delete'
export const CORK_BOARD_DELETE_CANCEL = 'Cancel'

export const CORK_BOARD_GENERATE_BEATS_PROMPT =
  'Generate 8-12 story beats for this episode. Each beat should have a logline, beat type, visual hook, and characters involved. Cover the full arc from setup through climax to resolution.'

export const CORK_BOARD_VISUAL_DIRECTOR_SENDER = 'VisualDirector'
export const CORK_BOARD_STORYBOARD_STARTED_CONTENT = `**Storyboard Generation Started**

I'm creating visual storyboards for {count} beats...

*Generating...*`

export const CORK_BOARD_COUNT_PLACEHOLDER = '{count}'

export const CORK_BOARD_STORYBOARD_FAILED_LOG = 'Storyboard generation failed'

export enum CorkBoardMessageType {
  Ai = 'ai',
}

export enum CorkBoardUrlScheme {
  Http = 'http',
}

export const CORK_BOARD_DRAG_EFFECT_MOVE = 'move'
