import { describe, expect, it } from 'vitest'
import { parseUpscaleProvider, UpscaleProvider } from '../upscale-provider-wire'

describe('upscale-provider-wire', () => {
  describe('parseUpscaleProvider', () => {
    it('parses valid Midjourney provider string', () => {
      expect(parseUpscaleProvider('midjourney')).toBe(UpscaleProvider.Midjourney)
    })

    it('parses valid Replicate provider string', () => {
      expect(parseUpscaleProvider('replicate')).toBe(UpscaleProvider.Replicate)
    })

    it('parses valid Stability provider string', () => {
      expect(parseUpscaleProvider('stability')).toBe(UpscaleProvider.Stability)
    })

    it('defaults to Stability for unknown string values', () => {
      expect(parseUpscaleProvider('dall-e-3')).toBe(UpscaleProvider.Stability)
      expect(parseUpscaleProvider('fal')).toBe(UpscaleProvider.Stability)
      expect(parseUpscaleProvider('')).toBe(UpscaleProvider.Stability)
    })

    it('defaults to Stability for non-string inputs', () => {
      expect(parseUpscaleProvider(null)).toBe(UpscaleProvider.Stability)
      expect(parseUpscaleProvider(undefined)).toBe(UpscaleProvider.Stability)
      expect(parseUpscaleProvider(123)).toBe(UpscaleProvider.Stability)
      expect(parseUpscaleProvider({})).toBe(UpscaleProvider.Stability)
      expect(parseUpscaleProvider(['midjourney'])).toBe(UpscaleProvider.Stability)
    })
  })
})
