import { describe, expect, it } from 'vitest'
import { stPatchEpisodeRequest } from '@/domains/storyteller/core/io/openapi-schemas'
import { episodePatchRequestSchema } from '@/domains/storyteller/core/io/episode-patch'

describe('episode PATCH schema', () => {
  it('is the OpenAPI body schema', () => {
    expect(stPatchEpisodeRequest).toBe(stPatchEpisodeRequest)
    expect(episodePatchRequestSchema.safeParse({ title: 'x' }).success).toBe(true)
  })

  it('rejects projectId and unknown keys', () => {
    expect(episodePatchRequestSchema.safeParse({ title: 'x', projectId: 'nope' }).success).toBe(
      false
    )
    expect(stPatchEpisodeRequest.safeParse({ title: 'x', projectId: 'nope' }).success).toBe(false)
  })

  it('accepts storyboardUrl and prompt aliases', () => {
    const parsed = episodePatchRequestSchema.safeParse({
      storyboardUrl: 'https://example.com/board.mp4',
      episode_prompt: 'tone',
    })
    expect(parsed.success).toBe(true)
  })
})
