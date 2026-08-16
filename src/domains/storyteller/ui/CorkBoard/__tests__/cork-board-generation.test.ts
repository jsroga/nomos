import { beforeEach, describe, expect, it, vi } from 'vitest'

const { toastError } = vi.hoisted(() => ({
  toastError: vi.fn(),
}))

vi.mock('react-hot-toast', () => ({
  default: { error: toastError, success: vi.fn() },
}))

import { BeatboardPremiseValidationCopy } from '@/domains/storyteller/core/constants/beatboard-premise-validation'
import {
  CORK_BOARD_GENERATE_BEATS_PROMPT,
  CorkBoardExistingBeatsLabel,
  CorkBoardPromptPlaceholder,
} from '../constants/cork-board'
import {
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

describe('requestCorkBoardTextBeats', () => {
  beforeEach(() => {
    toastError.mockReset()
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
      requestCorkBoardTextBeats(
        {
          logline: 'A night clerk must hide a body that ages backward before dawn.',
          protagonistHook: 'Mara opens the clinic and finds a patient younger than last night.',
          fatalFlaw: 'She trusts the ledger more than her own eyes.',
          stakes: 'If the board learns, the clinic is seized and her sister stays missing.',
          inevitableConsequence: 'The ledger writes her name and the clinic belongs to the board.',
          tenPointsPlan: TEN_POINTS,
        },
        onSendMessage
      )
    ).toBe(true)
    expect(onSendMessage).toHaveBeenCalledWith(CORK_BOARD_GENERATE_BEATS_PROMPT)
    expect(toastError).not.toHaveBeenCalled()
  })
})

describe('requestCorkBoardNextBeat', () => {
  beforeEach(() => {
    toastError.mockReset()
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
    const premise = {
      logline: 'A night clerk must hide a body that ages backward before dawn.',
      protagonistHook: 'Mara opens the clinic and finds a patient younger than last night.',
      fatalFlaw: 'She trusts the ledger more than her own eyes.',
      stakes: 'If the board learns, the clinic is seized and her sister stays missing.',
      inevitableConsequence: 'The ledger writes her name and the clinic belongs to the board.',
      tenPointsPlan: TEN_POINTS,
    }
    const existing = [{ sequence: 1, logline: 'Mara opens the clinic.' }]
    expect(requestCorkBoardNextBeat(premise, existing, onSendMessage)).toBe(true)
    const prompt = onSendMessage.mock.calls[0]?.[0]
    expect(prompt).toBe(corkBoardNextBeatPrompt(existing))
    expect(prompt).toContain('2')
    expect(prompt).toContain(existing[0].logline)
    expect(prompt).not.toContain(CorkBoardPromptPlaceholder.Sequence)
    expect(toastError).not.toHaveBeenCalled()
  })

  it('labels an empty board as the first beat', () => {
    expect(corkBoardNextBeatPrompt([])).toContain(CorkBoardExistingBeatsLabel.None)
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
