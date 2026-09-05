import { readFileSync } from 'node:fs'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const { toastError } = vi.hoisted(() => ({
  toastError: vi.fn(),
}))

vi.mock('react-hot-toast', () => ({
  default: { error: toastError, success: vi.fn() },
}))

import { BeatboardPremiseValidationCopy } from '@/domains/storyteller/core/constants/beatboard-premise-validation'
import {
  StorytellerChatTool,
  StorytellerWorkflowToolId,
} from '@/domains/storyteller/core/storyteller-page-wire'
import { GenerationActivityPhase } from '@/domains/storyteller/state/constants/storyteller-ui-store'
import { getStorytellerUiStore } from '@/domains/storyteller/state/useStorytellerUiStore'
import {
  CORK_BOARD_GENERATE_BEATS_PROMPT,
  CORK_BOARD_GENERATE_NEXT_BEAT_PROMPT,
  CORK_BOARD_STORY_STATE_RULE,
  CorkBoardBeatImagePolicy,
  CorkBoardCopy,
  CorkBoardExistingBeatsLabel,
  CorkBoardPromptPlaceholder,
} from '../constants/cork-board'
import {
  beatsForImageGeneration,
  corkBoardNextBeatPrompt,
  preferRicherBeats,
  requestCorkBoardNextBeat,
  requestCorkBoardTextBeats,
} from '../cork-board-generation'

const TEN_POINTS = [
  'Routine morning at the clinic',
  'The impossible body arrives',
  'Cover-up order from the board',
  'Protagonist hides the chart',
  'Rival doctor smells the lie',
  'Family arrives demanding answers',
  'The ledger names the protagonist',
  'Public accusation in the ward',
  'Burn the book or read the page',
  'The clinic is no longer theirs',
]

const RICH_PREMISE = {
  logline: 'A night clerk must hide a body that ages backward before dawn.',
  protagonistHook: 'Mara opens the clinic and finds a patient younger than last night.',
  fatalFlaw: 'She trusts the ledger more than her own eyes.',
  stakes: 'If the board learns, the clinic is seized and her sister stays missing.',
  inevitableConsequence: 'The ledger writes her name and the clinic belongs to the board.',
  tenPointsPlan: TEN_POINTS,
}

describe('requestCorkBoardTextBeats', () => {
  beforeEach(() => {
    toastError.mockReset()
  })

  afterEach(() => {
    getStorytellerUiStore().clearGenerationActivity()
  })

  it('blocks a thin premise and does not send a chat prompt', () => {
    const onSendMessage = vi.fn()
    expect(requestCorkBoardTextBeats({ logline: 'A clerk hides a body before dawn arrives.' }, onSendMessage)).toBe(
      false
    )
    expect(onSendMessage).not.toHaveBeenCalled()
    expect(toastError).toHaveBeenCalledWith(
      expect.stringContaining(BeatboardPremiseValidationCopy.TooThin)
    )
  })

  it('sends the text-only beat-board prompt when the premise is detailed', () => {
    const onSendMessage = vi.fn()
    expect(
      requestCorkBoardTextBeats(RICH_PREMISE, onSendMessage)
    ).toBe(true)
    expect(onSendMessage).toHaveBeenCalledWith(CORK_BOARD_GENERATE_BEATS_PROMPT)
    expect(CORK_BOARD_GENERATE_BEATS_PROMPT).toContain(CORK_BOARD_STORY_STATE_RULE)
    expect(CORK_BOARD_GENERATE_BEATS_PROMPT).toContain(StorytellerChatTool.ManageBeat)
    expect(CORK_BOARD_GENERATE_BEATS_PROMPT).toContain(StorytellerWorkflowToolId.RunBeatDraft)
    expect(toastError).not.toHaveBeenCalled()
  })

  it('does not start artifact-draft or beat-draft from Cork Board modules', () => {
    const generation = readFileSync('src/domains/storyteller/ui/CorkBoard/cork-board-generation.ts', 'utf8')
    const state = readFileSync('src/domains/storyteller/ui/CorkBoard/useCorkBoardState.ts', 'utf8')
    expect(generation).not.toContain('startStorytellerArtifactDraft')
    expect(generation).not.toContain('runArtifactDraftOverlay')
    expect(state).not.toContain('startStorytellerArtifactDraft')
    expect(state).not.toContain('runArtifactDraftOverlay')
    expect(CORK_BOARD_GENERATE_NEXT_BEAT_PROMPT).toContain(StorytellerWorkflowToolId.RunBeatDraft)
    expect(CORK_BOARD_GENERATE_NEXT_BEAT_PROMPT).toContain(StorytellerChatTool.ManageBeat)
  })

  it('leaves image controls free and toasts instead of sending while chat is busy', () => {
    getStorytellerUiStore().setGenerationActivity({
      phase: GenerationActivityPhase.Streaming,
    })
    const onSendMessage = vi.fn()
    expect(requestCorkBoardTextBeats(RICH_PREMISE, onSendMessage)).toBe(false)
    expect(onSendMessage).not.toHaveBeenCalled()
    expect(toastError).toHaveBeenCalledWith(CorkBoardCopy.WritersRoomBusy)
  })
})

describe('requestCorkBoardNextBeat', () => {
  beforeEach(() => {
    toastError.mockReset()
  })

  afterEach(() => {
    getStorytellerUiStore().clearGenerationActivity()
  })

  it('blocks a thin premise and does not send a chat prompt', () => {
    const onSendMessage = vi.fn()
    expect(
      requestCorkBoardNextBeat(
        { logline: 'A clerk hides a body before dawn arrives.' },
        [],
        onSendMessage
      )
    ).toBe(false)
    expect(onSendMessage).not.toHaveBeenCalled()
    expect(toastError).toHaveBeenCalledWith(
      expect.stringContaining(BeatboardPremiseValidationCopy.TooThin)
    )
  })

  it('asks for exactly the next beat and keeps existing cards', () => {
    const onSendMessage = vi.fn()
    const existing = [{ sequence: 1, logline: 'Mara opens the clinic.' }]
    expect(requestCorkBoardNextBeat(RICH_PREMISE, existing, onSendMessage)).toBe(true)
    const prompt = onSendMessage.mock.calls[0]?.[0]
    expect(prompt).toBe(corkBoardNextBeatPrompt(existing))
    expect(prompt).toContain(CORK_BOARD_STORY_STATE_RULE)
    expect(prompt).toContain('2')
    expect(prompt).toContain(existing[0].logline)
    expect(prompt).not.toContain(CorkBoardPromptPlaceholder.Sequence)
    expect(toastError).not.toHaveBeenCalled()
  })

  it('labels an empty board as the first beat', () => {
    expect(corkBoardNextBeatPrompt([])).toContain(CorkBoardExistingBeatsLabel.None)
  })
})

describe('beatsForImageGeneration', () => {
  const beats = [
    { id: 'a', imageUrl: 'one.png' },
    { id: 'b' },
    { id: 'c', imageUrl: 'three.png' },
  ]

  it('keeps every beat when overriding', () => {
    expect(beatsForImageGeneration(beats, CorkBoardBeatImagePolicy.Override)).toEqual(beats)
  })

  it('drops beats that already have images when skipping', () => {
    expect(beatsForImageGeneration(beats, CorkBoardBeatImagePolicy.SkipExisting)).toEqual([{ id: 'b' }])
  })
})

describe('preferRicherBeats', () => {
  it('keeps local cards the parent list has not caught up to', () => {
    const local = [
      { id: 'a', sequence: 1, logline: 'Open' },
      { id: 'b', sequence: 2, logline: 'Age' },
    ]
    const incoming = [{ id: 'a', sequence: 1, logline: 'Open' }]
    expect(preferRicherBeats(local, incoming)).toEqual(local)
  })
})
