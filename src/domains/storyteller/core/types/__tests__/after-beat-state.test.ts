import { describe, expect, it } from 'vitest'
import {
  AfterBeatStatePlace,
  AfterBeatStateSchema,
  AfterBeatStateWriteError,
  afterBeatStateFromApprovedBeat,
  afterBeatStateRowSaved,
  requirePersistedBeatId,
} from '@/domains/storyteller/core/types/after-beat-state'

const VALID = afterBeatStateFromApprovedBeat({
  charactersInvolved: ['Vera', 'Marcus'],
  setupFor: 'the silver bell',
  payoffFrom: 'the chapel key',
})

describe('AfterBeatStateSchema', () => {
  it('requires positions, injuries, objectsHeld, openPlants, and nextDecisionOwner', () => {
    expect(VALID.positions).toEqual([
      { character: 'Vera', place: AfterBeatStatePlace.Scene },
      { character: 'Marcus', place: AfterBeatStatePlace.Scene },
    ])
    expect(VALID.injuries).toEqual([])
    expect(VALID.objectsHeld).toEqual([{ character: 'Vera', object: 'the chapel key' }])
    expect(VALID.openPlants).toEqual(['the silver bell'])
    expect(VALID.nextDecisionOwner).toBe('Vera')
    expect(AfterBeatStateSchema.parse(VALID).nextDecisionOwner).toBe('Vera')
  })

  it('rejects a missing nextDecisionOwner', () => {
    expect(() =>
      AfterBeatStateSchema.parse({
        positions: [],
        injuries: [],
        objectsHeld: [],
        openPlants: [],
        nextDecisionOwner: '',
      })
    ).toThrow()
  })

  it('throws when no character can own the next decision', () => {
    expect(() => afterBeatStateFromApprovedBeat({ charactersInvolved: [] })).toThrow(
      AfterBeatStateWriteError.MissingOwner
    )
  })
})

describe('AfterBeatState persist guards', () => {
  it('throws when Approve has no beat id', () => {
    expect(() => requirePersistedBeatId(undefined)).toThrow(AfterBeatStateWriteError.MissingBeatId)
  })

  it('treats an empty returning set as a missed save', () => {
    expect(afterBeatStateRowSaved([])).toBe(false)
    expect(afterBeatStateRowSaved([{ id: 'beat-1' }])).toBe(true)
  })
})
