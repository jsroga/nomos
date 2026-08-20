import { beforeEach, describe, expect, it, vi } from 'vitest'
import { AsyncOperationStatus } from '@/shared/jobs/constants/async-operation-status'
import { OperationTypeId } from '@/shared/jobs/constants/operation-type-id'
import {
  BeatImageOperationDetail,
  BeatImageOperationLabel,
  BeatImageStorageKeyPrefix,
  beatImageOperationId,
} from '../constants/beat-image-service'

const BEAT_ID = '8db804d0-1c39-498e-97a5-dfd7eb828789'
const HANDLE_ID = 'run-beat-image-1'
const IMAGE_URL = 'https://cdn.example/beat.png'
const IMAGE_PROMPT = 'A clerk hides the aging body behind the ward curtain.'
const PROJECT_ID = '1f3c8a10-2b44-4c91-9e0a-7d2b1c4e8f90'
const POLL_STATUS = 'EXECUTING'

const addOperation = vi.fn()
const updateOperation = vi.fn()
const removeOperation = vi.fn()

vi.mock('@/shared/jobs/useGlobalStatusStore', () => ({
  useGlobalStatusStore: {
    getState: () => ({ addOperation, updateOperation, removeOperation }),
  },
}))

vi.mock('@/shared/data/browser-storage', () => ({
  browserStorage: { getStringOrDefault: () => 'flu-pro' },
}))

vi.mock('react-hot-toast', () => ({
  default: { error: vi.fn(), success: vi.fn() },
}))

vi.mock('@/domains/storyteller/core/io/beat-image.api', () => ({
  fetchBeatImagePrompt: vi.fn(),
  triggerBeatImageGeneration: vi.fn(),
  fetchBeatImageRunStatus: vi.fn(),
  readBeatImageUrlFromRun: vi.fn(),
  cancelBeatImageRun: vi.fn(),
}))

vi.mock('@/shared/data/polling/wait-for-trigger-run', async importOriginal => {
  const actual = await importOriginal<typeof import('@/shared/data/polling/wait-for-trigger-run')>()
  return {
    ...actual,
    waitForTriggerRun: vi.fn(),
  }
})

import {
  cancelBeatImageRun,
  fetchBeatImagePrompt,
  readBeatImageUrlFromRun,
  triggerBeatImageGeneration,
} from '@/domains/storyteller/core/io/beat-image.api'
import { waitForTriggerRun, TriggerRunPollAbortedError } from '@/shared/data/polling/wait-for-trigger-run'
import { beatImageService } from '../beat-image-service'

describe('beatImageOperationId', () => {
  it('namespaces the global status id by beat', () => {
    expect(beatImageOperationId(BEAT_ID)).toBe(`${BeatImageStorageKeyPrefix.BeatImageGen}${BEAT_ID}`)
  })
})

describe('beatImageService.generateImageForBeat', () => {
  beforeEach(() => {
    addOperation.mockReset()
    updateOperation.mockReset()
    removeOperation.mockReset()
    vi.mocked(fetchBeatImagePrompt).mockReset()
    vi.mocked(fetchBeatImagePrompt).mockResolvedValue(IMAGE_PROMPT)
    vi.mocked(triggerBeatImageGeneration).mockResolvedValue({ handleId: HANDLE_ID })
    vi.mocked(readBeatImageUrlFromRun).mockReturnValue(IMAGE_URL)
    vi.mocked(cancelBeatImageRun).mockReset()
    vi.mocked(cancelBeatImageRun).mockResolvedValue(undefined)
    vi.mocked(waitForTriggerRun).mockImplementation(async (_fetch, options) => {
      options?.onPoll?.({ status: POLL_STATUS, output: {}, error: undefined }, 1)
      return { status: 'COMPLETED', output: {} }
    })
  })

  it('registers the Trigger run on the global operations strip while it polls', async () => {
    const onUpdate = vi.fn()
    await beatImageService.generateImageForBeat(
      PROJECT_ID,
      {
        id: BEAT_ID,
        sequence: 3,
        logline: IMAGE_PROMPT,
        beatType: 'setup',
      },
      onUpdate,
    )

    expect(addOperation).toHaveBeenCalledWith({
      id: beatImageOperationId(BEAT_ID),
      type: OperationTypeId.StoryAgent,
      label: BeatImageOperationLabel.GeneratingBeatImage,
      details: BeatImageOperationDetail.CreatingStoryboard,
      status: AsyncOperationStatus.InProgress,
    })
    expect(updateOperation).toHaveBeenCalledWith(beatImageOperationId(BEAT_ID), {
      details: `${BeatImageOperationDetail.StatusPrefix}${POLL_STATUS}`,
    })
    expect(removeOperation).toHaveBeenCalledWith(beatImageOperationId(BEAT_ID))
    expect(vi.mocked(fetchBeatImagePrompt)).toHaveBeenCalledWith(
      expect.objectContaining({ id: BEAT_ID }),
      PROJECT_ID,
    )
  })

  it('returns without generating when the batch is already aborted', async () => {
    const onUpdate = vi.fn()
    await beatImageService.generateImageForBeat(
      PROJECT_ID,
      {
        id: BEAT_ID,
        sequence: 3,
        logline: IMAGE_PROMPT,
        beatType: 'setup',
      },
      onUpdate,
      { shouldAbort: () => true },
    )
    expect(vi.mocked(fetchBeatImagePrompt)).not.toHaveBeenCalled()
    expect(onUpdate).not.toHaveBeenCalled()
  })

  it('does not apply a finished image after the batch is cancelled', async () => {
    const onUpdate = vi.fn()
    let aborted = false
    vi.mocked(waitForTriggerRun).mockImplementation(async () => {
      aborted = true
      throw new TriggerRunPollAbortedError()
    })
    await beatImageService.generateImageForBeat(
      PROJECT_ID,
      {
        id: BEAT_ID,
        sequence: 3,
        logline: IMAGE_PROMPT,
        beatType: 'setup',
      },
      onUpdate,
      { shouldAbort: () => aborted },
    )
    expect(onUpdate).not.toHaveBeenCalledWith(BEAT_ID, { imageUrl: IMAGE_URL })
    expect(vi.mocked(cancelBeatImageRun)).toHaveBeenCalledWith(HANDLE_ID)
  })
})
