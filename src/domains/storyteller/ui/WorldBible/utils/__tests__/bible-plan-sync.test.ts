import { describe, expect, it } from 'vitest'
import { BiblePlanSyncDecision, shouldSyncLocalPlanFromParent } from '../bible-plan-sync'
import { resolveOverviewDisplayFields } from '../bible-overview-fields'

const OLD_PLAN = '{"worldDescription":"Old harbour."}'
const SAVED_PLAN = '{"worldDescription":"Edited harbour."}'
const ADD_TO_WORLD = '{"worldDescription":"Caldera rings."}'
const CALDERA = 'Caldera rings.'
const HARBOUR = 'Old harbour.'

describe('shouldSyncLocalPlanFromParent', () => {
  it('applies parent updates when not waiting on a save', () => {
    expect(
      shouldSyncLocalPlanFromParent({
        isEditing: false,
        parentPlanJson: ADD_TO_WORLD,
        lastSavedPlanJson: null,
        lastAppliedParentJson: OLD_PLAN,
      }),
    ).toBe(BiblePlanSyncDecision.Apply)
  })

  it('waits for the saved plan to echo while the parent is still the previous snapshot', () => {
    expect(
      shouldSyncLocalPlanFromParent({
        isEditing: false,
        parentPlanJson: OLD_PLAN,
        lastSavedPlanJson: SAVED_PLAN,
        lastAppliedParentJson: OLD_PLAN,
      }),
    ).toBe(BiblePlanSyncDecision.Wait)
  })

  it('applies Add to World while a save echo is still outstanding', () => {
    expect(
      shouldSyncLocalPlanFromParent({
        isEditing: false,
        parentPlanJson: ADD_TO_WORLD,
        lastSavedPlanJson: SAVED_PLAN,
        lastAppliedParentJson: OLD_PLAN,
      }),
    ).toBe(BiblePlanSyncDecision.Apply)
  })

  it('does not overwrite in-progress edits', () => {
    expect(
      shouldSyncLocalPlanFromParent({
        isEditing: true,
        parentPlanJson: ADD_TO_WORLD,
        lastSavedPlanJson: null,
        lastAppliedParentJson: OLD_PLAN,
      }),
    ).toBe(BiblePlanSyncDecision.Wait)
  })
})

describe('resolveOverviewDisplayFields', () => {
  it('prefers the committed story plan when Overview is not being edited', () => {
    const fields = resolveOverviewDisplayFields(
      { worldDescription: CALDERA },
      { worldDescription: HARBOUR },
      false,
    )
    expect(fields.worldDescription).toBe(CALDERA)
  })

  it('prefers the local draft while Overview is being edited', () => {
    const fields = resolveOverviewDisplayFields(
      { worldDescription: CALDERA },
      { worldDescription: HARBOUR },
      true,
    )
    expect(fields.worldDescription).toBe(HARBOUR)
  })
})
