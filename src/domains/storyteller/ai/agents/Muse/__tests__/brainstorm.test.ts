/**
 * Muse brainstorm mechanics — fake generate, no LLM (same tier as the
 * beat-draft workflow mechanics tests).
 */

import { describe, expect, it, vi } from 'vitest'
import { brainstormWildIdeas, filterActionForward, type MuseGenerate } from '../brainstorm'
import type { WildIdea } from '../wild-idea-schema'

const ACTION_IDEA: WildIdea = {
  hook: 'Vera signs the false confession with the bishop\'s own seal before the bells stop',
  mechanism: 'The seal is the instrumental object; the vesper bells are the countdown.',
  collision: 'Collides with the ledger plot — the confession invalidates the forgery evidence.',
}

const MOOD_IDEA: WildIdea = {
  hook: 'Marcus realizes everything changes and nothing will be the same',
  mechanism: 'A general sense of dread permeates the chapel.',
  collision: 'It deepens the atmosphere of mistrust.',
}

const STASIS_IDEA: WildIdea = {
  hook: 'Vera contemplates the weight of her choices in the empty chapel',
  mechanism: 'The venue evokes memory.',
  collision: 'Her past resurfaces.',
}

describe('filterActionForward', () => {
  it('passes an action-forward idea', () => {
    expect(filterActionForward(ACTION_IDEA)).toBeNull()
  })

  it('rejects vague phrases', () => {
    expect(filterActionForward(MOOD_IDEA)).toContain('vague phrase')
  })

  it('rejects stasis hooks', () => {
    expect(filterActionForward(STASIS_IDEA)).toContain('stasis hook')
  })

  it('rejects hooks with no verb of consequence', () => {
    const result = filterActionForward({
      hook: 'A strange mood over the harbor as dawn arrives quietly',
      mechanism: 'Atmosphere.',
      collision: 'None.',
    })
    expect(result).toBeTruthy()
  })
})

describe('brainstormWildIdeas (mechanics, fake model)', () => {
  it('deals distinct hands, collects survivors, records rejects with reasons', async () => {
    const generate = vi.fn<MuseGenerate>(async () => ({
      ideas: [ACTION_IDEA, MOOD_IDEA, STASIS_IDEA],
    }))
    const result = await brainstormWildIdeas(
      {
        premiseFragment: 'A forged ledger threatens the house.',
        characters: ['Vera', 'Marcus'],
        seedText: 'episode-1:test',
        handCount: 3,
      },
      generate
    )

    expect(generate).toHaveBeenCalledTimes(3)
    // Each call got a DIFFERENT entropy hand (prompts differ).
    const prompts = generate.mock.calls.map(call => call[0])
    expect(new Set(prompts).size).toBe(3)
    // 3 calls × 1 surviving idea each.
    expect(result.ideas).toHaveLength(3)
    expect(result.ideas[0].handMechanismId).toBeTruthy()
    expect(result.rejected).toHaveLength(6)
    expect(result.rejected.every(r => r.reason.length > 0)).toBe(true)
  })

  it('is deterministic for the same seed and drops schema-invalid batches without throwing', async () => {
    const generate = vi.fn<MuseGenerate>(async () => ({ nonsense: true }))
    const result = await brainstormWildIdeas(
      { premiseFragment: 'x', characters: [], seedText: 'stable-seed', handCount: 2 },
      generate
    )
    expect(result.ideas).toHaveLength(0)
    expect(result.rejected).toHaveLength(0)

    const promptsFirst = generate.mock.calls.map(call => call[0])
    generate.mockClear()
    await brainstormWildIdeas(
      { premiseFragment: 'x', characters: [], seedText: 'stable-seed', handCount: 2 },
      generate
    )
    const promptsSecond = generate.mock.calls.map(call => call[0])
    expect(promptsFirst).toEqual(promptsSecond)
  })
})
