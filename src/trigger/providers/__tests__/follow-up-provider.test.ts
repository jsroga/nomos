import { describe, expect, it } from 'vitest'
import { TileTriggerProvider } from '@/shared/data/constants/trigger-tile-route'
import { resolveFollowUpImageProviderFromEnv } from '../follow-up-provider'

describe('resolveFollowUpImageProviderFromEnv', () => {
  it('selects grok when FOLLOW_UP_IMAGE_PROVIDER=grok', () => {
    expect(
      resolveFollowUpImageProviderFromEnv({ FOLLOW_UP_IMAGE_PROVIDER: 'grok' })
    ).toBe(TileTriggerProvider.Grok)
  })

  it('keeps LegNext upload-paint and midjourney/legnext aliases', () => {
    expect(
      resolveFollowUpImageProviderFromEnv({
        FOLLOW_UP_IMAGE_PROVIDER: 'legnext-upload-paint',
      })
    ).toBe(TileTriggerProvider.LegnextUploadPaint)
    expect(
      resolveFollowUpImageProviderFromEnv({ FOLLOW_UP_IMAGE_PROVIDER: 'midjourney' })
    ).toBe(TileTriggerProvider.LegnextUploadPaint)
    expect(
      resolveFollowUpImageProviderFromEnv({ FOLLOW_UP_IMAGE_PROVIDER: 'legnext' })
    ).toBe(TileTriggerProvider.LegnextUploadPaint)
  })

  it('defaults to grok when unset and OpenRouter is configured', () => {
    expect(resolveFollowUpImageProviderFromEnv({ OPENROUTER_API_KEY: 'sk-or-test' })).toBe(
      TileTriggerProvider.Grok
    )
  })

  it('defaults to nano-banana when unset and OpenRouter is missing', () => {
    expect(resolveFollowUpImageProviderFromEnv({})).toBe(TileTriggerProvider.NanoBanana)
  })

  it('never falls back to LegNext implicitly', () => {
    expect(resolveFollowUpImageProviderFromEnv({ OPENROUTER_API_KEY: 'sk-or-test' })).not.toBe(
      TileTriggerProvider.LegnextUploadPaint
    )
  })
})
