import { describe, expect, it } from 'vitest'
import { stPatchCharacterRequest } from '@/domains/storyteller/core/io/openapi-schemas'
import {
  buildCharacterPatchUpdates,
  characterPatchRequestSchema,
} from '@/domains/storyteller/core/character-patch'

describe('character PATCH schema', () => {
  it('is the OpenAPI body schema', () => {
    expect(stPatchCharacterRequest).toBe(stPatchCharacterRequest)
    expect(characterPatchRequestSchema.safeParse({ name: 'x' }).success).toBe(true)
  })

  it('strips projectId and does not write it', () => {
    const parsed = characterPatchRequestSchema.parse({
      name: 'ok',
      projectId: 'nope',
      id: 'char-1',
    })
    expect(parsed).toEqual({ name: 'ok', id: 'char-1' })
    expect(buildCharacterPatchUpdates(parsed)).toEqual({ name: 'ok' })
  })

  it('rejects a non-number morality', () => {
    expect(characterPatchRequestSchema.safeParse({ morality: 'high' }).success).toBe(false)
  })
})
