import { beforeEach, describe, expect, it, vi } from 'vitest'
import { postReplicateSegment, postSegment } from '../select-mode.api'
import { fetchJsonRecord } from '@/shared/data/fetch-json-record'
import { waitForTriggerRun } from '@/shared/data/polling/wait-for-trigger-run'

vi.mock('@/shared/data/fetch-json-record', () => ({
  fetchJsonRecord: vi.fn(),
}))

vi.mock('@/shared/data/polling/wait-for-trigger-run', () => ({
  waitForTriggerRun: vi.fn(),
}))

describe('select-mode.api', () => {
  const controller = new AbortController()

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('postReplicateSegment', () => {
    it('sends segmentation request to Replicate segment route', async () => {
      vi.mocked(fetchJsonRecord).mockResolvedValue({ success: true, rle: '0 5 10 2' })

      const result = await postReplicateSegment({
        image: 'base64_image_data',
        apiKey: 'r8_test_key',
        signal: controller.signal,
      })

      expect(result.success).toBe(true)
      expect(fetchJsonRecord).toHaveBeenCalledWith(
        '/api/ai/segment',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({ image: 'base64_image_data', points: [], apiKey: 'r8_test_key' }),
        })
      )
    })

    it('throws error when response contains error message', async () => {
      vi.mocked(fetchJsonRecord).mockResolvedValue({ error: 'Failed to process image' })

      await expect(
        postReplicateSegment({
          image: 'bad_image',
          apiKey: 'r8_test_key',
          signal: controller.signal,
        })
      ).rejects.toThrow('Failed to process image')
    })
  })

  describe('postSegment', () => {
    it('enqueues segment task and waits for trigger run completion', async () => {
      vi.mocked(fetchJsonRecord).mockResolvedValue({ runId: 'seg-run-123' })
      vi.mocked(waitForTriggerRun).mockResolvedValue({
        output: {
          rle: '0 10 20 30',
          width: 512,
          height: 512,
        },
      })

      const result = await postSegment({
        projectId: 'p-1',
        base64Image: 'mosaic_b64',
        box: { x1: 10, y1: 10, x2: 100, y2: 100 },
        prompt: 'Select chest',
        mosaicWidth: 512,
        mosaicHeight: 512,
        signal: controller.signal,
      })

      expect(result.rle).toBe('0 10 20 30')
      expect(result.width).toBe(512)
      expect(result.height).toBe(512)
    })

    it('throws when segment enqueue fails to return runId', async () => {
      vi.mocked(fetchJsonRecord).mockResolvedValue({})

      await expect(
        postSegment({
          projectId: 'p-1',
          base64Image: 'mosaic_b64',
          box: { x1: 0, y1: 0, x2: 50, y2: 50 },
          mosaicWidth: 512,
          mosaicHeight: 512,
          signal: controller.signal,
        })
      ).rejects.toThrow('Failed to trigger segment task')
    })

    it('throws when trigger run finishes without RLE mask', async () => {
      vi.mocked(fetchJsonRecord).mockResolvedValue({ runId: 'seg-run-123' })
      vi.mocked(waitForTriggerRun).mockResolvedValue({ output: {} })

      await expect(
        postSegment({
          projectId: 'p-1',
          base64Image: 'mosaic_b64',
          box: { x1: 0, y1: 0, x2: 50, y2: 50 },
          mosaicWidth: 512,
          mosaicHeight: 512,
          signal: controller.signal,
        })
      ).rejects.toThrow('Segment run completed without an RLE mask')
    })
  })
})
