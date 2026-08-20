import { beforeEach, describe, expect, it, vi } from 'vitest'
import { AsyncOperationStatus } from '@/shared/jobs/constants/async-operation-status'
import { OperationTypeId } from '@/shared/jobs/constants/operation-type-id'
import {
  RepaintOperationDetail,
  RepaintOperationId,
  RepaintOperationLabel,
} from '../../../constants/repaint-service'

const addOperation = vi.fn()
const removeOperation = vi.fn()

vi.mock('@/shared/jobs/useGlobalStatusStore', () => ({
  useGlobalStatusStore: {
    getState: () => ({ addOperation, removeOperation }),
  },
}))

import { clearRepaintGenerate, trackRepaintGenerateStart } from '../repaint-service'

describe('trackRepaintGenerateStart', () => {
  beforeEach(() => {
    addOperation.mockReset()
    removeOperation.mockReset()
  })

  it('registers a world-gen operation so the top-right widget counts paint generate', () => {
    const opId = trackRepaintGenerateStart('casino')
    expect(opId).toBe(RepaintOperationId.Generate)
    expect(addOperation).toHaveBeenCalledWith({
      id: RepaintOperationId.Generate,
      type: OperationTypeId.WorldGen,
      label: RepaintOperationLabel.Painting,
      details: 'casino',
      status: AsyncOperationStatus.InProgress,
    })
  })

  it('falls back to Inpaint when the prompt is empty', () => {
    trackRepaintGenerateStart('   ')
    expect(addOperation).toHaveBeenCalledWith(
      expect.objectContaining({ details: RepaintOperationDetail.Inpaint })
    )
  })

  it('clears the same operation id', () => {
    clearRepaintGenerate(RepaintOperationId.Generate)
    expect(removeOperation).toHaveBeenCalledWith(RepaintOperationId.Generate)
  })
})
