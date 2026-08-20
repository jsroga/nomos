import { describe, expect, it } from 'vitest'
import { ListCharactersInputSchema } from '../character-tools-schema'
import { ListEpisodesInputSchema } from '../episode-tools-schema'

describe('list tool projectId', () => {
  it('accepts an empty object so open-workspace injection can run', () => {
    expect(ListEpisodesInputSchema.safeParse({}).success).toBe(true)
    expect(ListCharactersInputSchema.safeParse({}).success).toBe(true)
  })
})
