import { beforeEach, describe, expect, it, vi } from 'vitest'
import { AsyncOperationStatus } from '@/shared/jobs/constants/async-operation-status'
import { OperationTypeId } from '@/shared/jobs/constants/operation-type-id'

const addOperation = vi.fn()
const updateOperation = vi.fn()
const removeOperation = vi.fn()

vi.mock('@/shared/jobs/useGlobalStatusStore', () => ({
  useGlobalStatusStore: {
    getState: () => ({ addOperation, updateOperation, removeOperation }),
  },
}))

import {
  CharacterPortraitOperationDetail,
  CharacterPortraitOperationLabel,
  CharacterPortraitOperationMetaKey,
  bindPortraitGenerationRun,
  clearPortraitGeneration,
  isCharacterPortraitGenerating,
  portraitGenOperationId,
  portraitOperationDetails,
  trackPortraitGenerationStart,
} from '../character-portrait-operation'

const CHAR_ID = 'char-1'
const RUN_ID = 'run-1'

describe('trackPortraitGenerationStart', () => {
  beforeEach(() => {
    addOperation.mockReset()
    updateOperation.mockReset()
    removeOperation.mockReset()
  })

  it('registers a portrait-gen operation for the top-right widget', () => {
    const opId = trackPortraitGenerationStart(CHAR_ID)
    expect(opId).toBe(portraitGenOperationId(CHAR_ID))
    expect(addOperation).toHaveBeenCalledWith({
      id: opId,
      type: OperationTypeId.PortraitGen,
      label: CharacterPortraitOperationLabel.Generating,
      details: portraitOperationDetails({
        detail: CharacterPortraitOperationDetail.Creating,
      }),
      status: AsyncOperationStatus.InProgress,
    })
  })

  it('stores the Trigger run id so the widget can resume after reload', () => {
    bindPortraitGenerationRun(portraitGenOperationId(CHAR_ID), RUN_ID)
    expect(updateOperation).toHaveBeenCalledWith(portraitGenOperationId(CHAR_ID), {
      details: portraitOperationDetails({
        runId: RUN_ID,
        detail: CharacterPortraitOperationDetail.Creating,
      }),
    })
    const details = JSON.parse(
      portraitOperationDetails({
        runId: RUN_ID,
        detail: CharacterPortraitOperationDetail.Creating,
      }),
    )
    expect(details[CharacterPortraitOperationMetaKey.RunId]).toBe(RUN_ID)
    expect(details[CharacterPortraitOperationMetaKey.TaskId]).toBe(RUN_ID)
  })

  it('clears the same operation id', () => {
    clearPortraitGeneration(portraitGenOperationId(CHAR_ID))
    expect(removeOperation).toHaveBeenCalledWith(portraitGenOperationId(CHAR_ID))
  })
})

describe('isCharacterPortraitGenerating', () => {
  it('is true while the portrait-gen operation is active', () => {
    expect(
      isCharacterPortraitGenerating(
        [
          {
            id: portraitGenOperationId(CHAR_ID),
            type: OperationTypeId.PortraitGen,
            label: CharacterPortraitOperationLabel.Generating,
            status: AsyncOperationStatus.InProgress,
          },
        ],
        CHAR_ID,
      ),
    ).toBe(true)
  })

  it('is false when that character has no active portrait-gen operation', () => {
    expect(
      isCharacterPortraitGenerating(
        [
          {
            id: portraitGenOperationId(CHAR_ID),
            type: OperationTypeId.PortraitGen,
            label: CharacterPortraitOperationLabel.Generating,
            status: AsyncOperationStatus.Completed,
          },
        ],
        CHAR_ID,
      ),
    ).toBe(false)
    expect(isCharacterPortraitGenerating([], CHAR_ID)).toBe(false)
  })
})
