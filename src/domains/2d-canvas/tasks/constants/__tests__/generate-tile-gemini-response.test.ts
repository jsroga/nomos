import { describe, expect, it, vi } from 'vitest'
import { extractGeminiImageData } from '../generate-tile-gemini-response'
import type { GeminiResponse } from '../generate-tile-json-guards'
import { GeminiFinishReason } from '@/shared/data/constants/repaint-gemini'

describe('generate-tile-gemini-response', () => {
  const defaultCtx = {
    model: 'gemini-2.0-flash-exp',
    prompt: 'Isometric medieval stone house',
    payload: { contents: [] },
  }

  it('extracts image data and calls processImage callback', async () => {
    const geminiResponse: GeminiResponse = {
      candidates: [
        {
          finishReason: 'STOP',
          content: {
            parts: [
              {
                inline_data: {
                  mime_type: 'image/png',
                  data: 'raw-gemini-b64',
                },
              },
            ],
          },
        },
      ],
    }

    const processImageMock = vi.fn().mockResolvedValue('processed-png-base64')
    const result = await extractGeminiImageData(geminiResponse, defaultCtx, processImageMock)

    expect(processImageMock).toHaveBeenCalledTimes(1)
    expect(result).toBe('processed-png-base64')
  })

  it('throws when candidates array is empty or missing', async () => {
    const emptyResponse: GeminiResponse = {}
    const processImageMock = vi.fn()

    await expect(
      extractGeminiImageData(emptyResponse, defaultCtx, processImageMock)
    ).rejects.toThrow('No candidates returned from Gemini')
    expect(processImageMock).not.toHaveBeenCalled()
  })

  it('throws when generation is blocked by safety filters', async () => {
    const safetyResponse: GeminiResponse = {
      candidates: [
        {
          finishReason: GeminiFinishReason.Safety,
          content: { parts: [] },
        },
      ],
    }
    const processImageMock = vi.fn()

    await expect(
      extractGeminiImageData(safetyResponse, defaultCtx, processImageMock)
    ).rejects.toThrow('Generation blocked by safety filters')
  })

  it('throws when candidate has empty content parts', async () => {
    const emptyPartsResponse: GeminiResponse = {
      candidates: [
        {
          finishReason: 'STOP',
          content: { parts: [] },
        },
      ],
    }
    const processImageMock = vi.fn()

    await expect(
      extractGeminiImageData(emptyPartsResponse, defaultCtx, processImageMock)
    ).rejects.toThrow('No content parts returned')
  })

  it('throws detailed error when Gemini returns text instead of image', async () => {
    const textOnlyResponse: GeminiResponse = {
      candidates: [
        {
          finishReason: 'STOP',
          content: {
            parts: [
              {
                text: 'I cannot generate this image due to policy constraints.',
              },
            ],
          },
        },
      ],
    }
    const processImageMock = vi.fn()

    await expect(
      extractGeminiImageData(textOnlyResponse, defaultCtx, processImageMock)
    ).rejects.toThrow('Gemini returned text instead of image: I cannot generate this image due to policy constraints.')
  })

  it('throws generic error when candidate has parts but none contain image or text', async () => {
    const badPartResponse: GeminiResponse = {
      candidates: [
        {
          finishReason: 'STOP',
          content: {
            parts: [{ text: undefined, inlineData: undefined }],
          },
        },
      ],
    }
    const processImageMock = vi.fn()

    await expect(
      extractGeminiImageData(badPartResponse, defaultCtx, processImageMock)
    ).rejects.toThrow('No image found in Gemini response')
  })
})
