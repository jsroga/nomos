import { describe, expect, it } from 'vitest'
import {
  explicitCastCreateScorer,
  scoreExplicitCastCreate,
} from '../explicit-cast-create-scorer'

describe('explicit-cast-create scorer', () => {
  it('returns 1 when manage_character create names Vex', () => {
    expect(scoreExplicitCastCreate('manage_character create Vex')).toBe(1)
  })

  it('returns 0 when the turn refuses to the UI', async () => {
    expect(scoreExplicitCastCreate('create the character from the UI')).toBe(0)
    const result = await explicitCastCreateScorer.run({
      output: 'I cannot create Vex because it contradicts the world.',
    })
    expect(result.score).toBe(0)
  })
})
