import { describe, expect, it } from 'vitest'
import { castPeopleFromUnknown } from '../../structural'
import {
  EXPECTED_PROMPT_COUNT,
  PROMPTS_PER_SITUATION,
  PromptSituation,
  beatDraftBrief,
  loadWorldFixture,
} from '../index'

const WORLD = 'aeternum'

describe('loadWorldFixture', () => {
  it('loads eight prompts, two per situation, with prior state and cast names', () => {
    const fixture = loadWorldFixture(WORLD)
    expect(fixture.world).toBe(WORLD)
    expect(fixture.systemPrompt.length).toBeGreaterThan(0)
    expect(fixture.prompts).toHaveLength(EXPECTED_PROMPT_COUNT)

    const people = castPeopleFromUnknown(fixture.cast)
    const names = new Set(people.map(person => person.name))
    const situationCounts: Record<PromptSituation, number> = {
      [PromptSituation.Political]: 0,
      [PromptSituation.Intimate]: 0,
      [PromptSituation.Violent]: 0,
      [PromptSituation.Procedural]: 0,
    }

    for (const prompt of fixture.prompts) {
      expect(prompt.priorStoryState.length).toBeGreaterThan(0)
      expect(prompt.brief.length).toBeGreaterThan(0)
      expect(beatDraftBrief(prompt).startsWith(prompt.priorStoryState)).toBe(true)
      situationCounts[prompt.situation] += 1
      for (const name of prompt.characters) {
        expect(names.has(name), name).toBe(true)
      }
    }

    expect(situationCounts[PromptSituation.Political]).toBe(PROMPTS_PER_SITUATION)
    expect(situationCounts[PromptSituation.Intimate]).toBe(PROMPTS_PER_SITUATION)
    expect(situationCounts[PromptSituation.Violent]).toBe(PROMPTS_PER_SITUATION)
    expect(situationCounts[PromptSituation.Procedural]).toBe(PROMPTS_PER_SITUATION)
  })

  it('fails when the world directory is missing', () => {
    expect(() => loadWorldFixture('wieczna-korona')).toThrow(/missing world fixture directory/)
  })
})
