import { describe, expect, it } from 'vitest'
import {
  parseGeminiResponse,
  parseLegNextJob,
  readGeminiImageData,
  readLegNextImageUrl,
  readOpenAiB64Json,
  readStabilityBase64,
  type GeminiContentPart,
  type LegNextJobResult,
} from '../generate-tile-json-guards'
import { LegNextJobStatus } from '@/shared/ai/constants/legnext'

describe('generate-tile-json-guards', () => {
  describe('parseGeminiResponse & readGeminiImageData', () => {
    it('parses valid candidate with inline_data image part', () => {
      const payload = {
        candidates: [
          {
            finishReason: 'STOP',
            content: {
              parts: [
                {
                  inline_data: {
                    mime_type: 'image/png',
                    data: 'base64-png-data',
                  },
                },
                {
                  text: 'Here is your isometric tile',
                },
              ],
            },
          },
        ],
      }

      const parsed = parseGeminiResponse(payload)
      expect(parsed.candidates).toBeDefined()
      expect(parsed.candidates).toHaveLength(1)
      expect(parsed.candidates?.[0].finishReason).toBe('STOP')
      expect(parsed.candidates?.[0].content?.parts).toHaveLength(2)

      const part0 = parsed.candidates?.[0].content?.parts?.[0]
      expect(part0).toBeDefined()
      if (part0) {
        expect(readGeminiImageData(part0)).toBe('base64-png-data')
      }
    })

    it('parses inlineData with camelCase properties', () => {
      const payload = {
        candidates: [
          {
            content: {
              parts: [
                {
                  inlineData: {
                    mimeType: 'image/jpeg',
                    data: 'jpeg-data',
                  },
                },
              ],
            },
          },
        ],
      }

      const parsed = parseGeminiResponse(payload)
      const part = parsed.candidates?.[0]?.content?.parts?.[0]
      expect(part).toBeDefined()
      if (part) {
        expect(readGeminiImageData(part)).toBe('jpeg-data')
      }
    })

    it('returns undefined for candidates if payload is empty or malformed', () => {
      expect(parseGeminiResponse(null).candidates).toBeUndefined()
      expect(parseGeminiResponse(undefined).candidates).toBeUndefined()
      expect(parseGeminiResponse('bad string').candidates).toBeUndefined()
      expect(parseGeminiResponse({}).candidates).toBeUndefined()
      expect(parseGeminiResponse({ candidates: 'not an array' }).candidates).toBeUndefined()
    })

    it('filters out non-object elements in candidates and parts', () => {
      const payload = {
        candidates: [
          null,
          123,
          {
            content: {
              parts: [null, 'invalid', { text: 'valid text' }],
            },
          },
        ],
      }

      const parsed = parseGeminiResponse(payload)
      expect(parsed.candidates).toHaveLength(1)
      expect(parsed.candidates?.[0].content?.parts).toHaveLength(1)
      expect(parsed.candidates?.[0].content?.parts?.[0].text).toBe('valid text')
    })

    it('readGeminiImageData returns undefined for text-only parts or empty data', () => {
      const part: GeminiContentPart = { text: 'hello' }
      expect(readGeminiImageData(part)).toBeUndefined()

      const emptyInlinePart: GeminiContentPart = { inline_data: {} }
      expect(readGeminiImageData(emptyInlinePart)).toBeUndefined()
    })
  })

  describe('parseLegNextJob & readLegNextImageUrl', () => {
    it('parses LegNext successful job with image_url', () => {
      const payload = {
        status: 'SUCCESS',
        message: 'Task completed',
        job_id: 'legnext-job-123',
        output: {
          image_url: 'https://cdn.legnext.com/img123.png',
        },
      }

      const parsed = parseLegNextJob(payload)
      expect(parsed.status).toBe('SUCCESS')
      expect(parsed.message).toBe('Task completed')
      expect(parsed.job_id).toBe('legnext-job-123')
      expect(parsed.output?.image_url).toBe('https://cdn.legnext.com/img123.png')
      expect(readLegNextImageUrl(parsed)).toBe('https://cdn.legnext.com/img123.png')
    })

    it('parses LegNext job with image_urls array and error_messages', () => {
      const payload = {
        status: 'RUNNING',
        output: {
          image_urls: ['https://cdn.legnext.com/v1.png', 'https://cdn.legnext.com/v2.png'],
          error_messages: ['non-fatal warning'],
        },
      }

      const parsed = parseLegNextJob(payload)
      expect(parsed.status).toBe('RUNNING')
      expect(parsed.output?.image_urls).toEqual([
        'https://cdn.legnext.com/v1.png',
        'https://cdn.legnext.com/v2.png',
      ])
      expect(parsed.output?.error_messages).toEqual(['non-fatal warning'])
      expect(readLegNextImageUrl(parsed)).toBe('https://cdn.legnext.com/v1.png')
    })

    it('defaults to Pending status if status is missing', () => {
      const parsed = parseLegNextJob({})
      expect(parsed.status).toBe(LegNextJobStatus.Pending)
      expect(parsed.output?.image_url).toBeUndefined()
      expect(parsed.output?.image_urls).toEqual([])
      expect(readLegNextImageUrl(parsed)).toBeUndefined()
    })

    it('readLegNextImageUrl returns undefined when result output is missing', () => {
      const result: LegNextJobResult = { status: 'FAILED' }
      expect(readLegNextImageUrl(result)).toBeUndefined()
    })
  })

  describe('readOpenAiB64Json', () => {
    it('extracts b64_json from standard OpenAI images response', () => {
      const payload = {
        created: 1700000000,
        data: [
          {
            b64_json: 'iVBORw0KGgoAAAANSUhEUgAA...',
            revised_prompt: 'A prompt',
          },
        ],
      }

      expect(readOpenAiB64Json(payload)).toBe('iVBORw0KGgoAAAANSUhEUgAA...')
    })

    it('returns undefined if data array is empty or missing', () => {
      expect(readOpenAiB64Json({})).toBeUndefined()
      expect(readOpenAiB64Json({ data: [] })).toBeUndefined()
      expect(readOpenAiB64Json({ data: [null] })).toBeUndefined()
      expect(readOpenAiB64Json({ data: ['not an object'] })).toBeUndefined()
      expect(readOpenAiB64Json(null)).toBeUndefined()
    })

    it('returns undefined if b64_json is not a string', () => {
      expect(readOpenAiB64Json({ data: [{ b64_json: 12345 }] })).toBeUndefined()
    })
  })

  describe('readStabilityBase64', () => {
    it('extracts base64 from Stability artifacts array', () => {
      const payload = {
        artifacts: [
          {
            base64: 'stability-b64-image-bytes',
            finishReason: 'SUCCESS',
            seed: 42,
          },
        ],
      }

      expect(readStabilityBase64(payload)).toBe('stability-b64-image-bytes')
    })

    it('returns undefined if artifacts array is empty or invalid', () => {
      expect(readStabilityBase64({})).toBeUndefined()
      expect(readStabilityBase64({ artifacts: [] })).toBeUndefined()
      expect(readStabilityBase64({ artifacts: [null] })).toBeUndefined()
      expect(readStabilityBase64(null)).toBeUndefined()
      expect(readStabilityBase64({ artifacts: [{ base64: null }] })).toBeUndefined()
    })
  })
})
