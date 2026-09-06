import { describe, expect, it } from 'vitest'
import { stPatchBeatRequest } from '@/domains/storyteller/core/io/openapi-schemas'
import { beatPatchRequestSchema, pickBeatPatchUpdates } from '@/domains/storyteller/core/beat-patch'

describe('beat PATCH schema', () => {
  it('is the OpenAPI body schema', () => {
    expect(stPatchBeatRequest).toBe(stPatchBeatRequest)
    expect(beatPatchRequestSchema.safeParse({ logline: 'x' }).success).toBe(true)
  })

  it('strips identity keys and does not copy them into updates', () => {
    const parsed = beatPatchRequestSchema.parse({
      logline: 'ok',
      episodeId: 'nope',
      projectId: 'nope',
      id: 'forged',
    })
    expect(parsed).toEqual({ logline: 'ok' })
    expect(pickBeatPatchUpdates(parsed)).toEqual({ logline: 'ok' })
  })

  it('rejects a non-string logline', () => {
    expect(beatPatchRequestSchema.safeParse({ logline: 12 }).success).toBe(false)
  })
})
