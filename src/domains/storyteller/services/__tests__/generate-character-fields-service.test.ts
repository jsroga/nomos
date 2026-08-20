import { beforeEach, describe, expect, it, vi } from 'vitest'
import { zodSchema } from 'ai'
import { recordFromJson } from '@/shared/data/json-guards'
import {
  CharacterMetricFieldKey,
  DEFAULT_CHARACTER_METRICS,
  type CharacterFilledDraft,
} from '../../core/character-missing-fields'
import { GenerateCharacterFieldsErrorCode, generatedCharacterFieldsLlmSchema } from '../constants/generate-character-fields'
import {
  GenerateCharacterFieldsError,
  generateCharacterMissingFields,
} from '../generate-character-fields-service'
import { assembleStoryCanonPack } from '../story-canon-pack'
import { StoryCanonPackLabel } from '../constants/story-canon-pack'

const PROJECT_ID = '11111111-1111-1111-1111-111111111111'
const VERA = 'Vera'
const VERA_DESC = 'Vera keeps the wardens at bay.'
const WORLD = 'A frozen ward holds the last ledger.'

const emptyPack = assembleStoryCanonPack(PROJECT_ID, {
  projectName: '',
  seriesBible: {},
  storyPlanContent: {},
  projectStoryPlan: {},
  episodes: [],
  characters: [],
})

const usablePack = assembleStoryCanonPack(PROJECT_ID, {
  projectName: 'Ward',
  seriesBible: {},
  storyPlanContent: { worldDescription: WORLD },
  projectStoryPlan: {},
  episodes: [
    {
      id: '22222222-2222-2222-2222-222222222222',
      sequence: 1,
      title: 'Pilot',
      premise: 'The ledger lies.',
      storyPlan: {},
      tenPointsPlan: [],
      thematicFocus: null,
    },
  ],
  characters: [{ name: VERA, role: 'Protagonist', description: VERA_DESC, psychology: {} }],
})

function draft(overrides: Partial<CharacterFilledDraft> = {}): CharacterFilledDraft {
  return {
    name: '',
    gender: '',
    role: 'Supporting',
    description: '',
    mbti: '',
    motivation: '',
    fatalFlaw: '',
    secrets: '',
    metrics: { ...DEFAULT_CHARACTER_METRICS },
    ...overrides,
  }
}

describe('generateCharacterMissingFields', () => {
  const generate = vi.fn()
  const loadCanonPack = vi.fn()

  beforeEach(() => {
    generate.mockReset()
    loadCanonPack.mockReset()
  })

  it('rejects an empty draft when bible and episodes are empty', async () => {
    loadCanonPack.mockResolvedValue(emptyPack)

    await expect(
      generateCharacterMissingFields({ projectId: PROJECT_ID, filled: draft() }, { generate, loadCanonPack })
    ).rejects.toMatchObject({ code: GenerateCharacterFieldsErrorCode.InsufficientContext })
    expect(generate).not.toHaveBeenCalled()
  })

  it('returns without calling the model when nothing is missing', async () => {
    const filled = draft({
      name: VERA,
      gender: 'Female',
      description: VERA_DESC,
      mbti: 'INTJ',
      motivation: 'Protect',
      fatalFlaw: 'Pride',
      secrets: 'Hidden ledger',
      metrics: {
        valence: -20,
        arousal: 40,
        autonomy: 55,
        competence: 45,
        relatedness: 35,
        cognitiveClarity: 60,
        perceivedStakes: 70,
        socialSafety: 40,
        moralAlignment: 50,
      },
    })

    const result = await generateCharacterMissingFields(
      { projectId: PROJECT_ID, filled },
      { generate, loadCanonPack }
    )

    expect(result).toEqual({})
    expect(generate).not.toHaveBeenCalled()
    expect(loadCanonPack).not.toHaveBeenCalled()
  })

  it('strips already-filled keys from the model payload', async () => {
    loadCanonPack.mockResolvedValue(usablePack)
    generate.mockResolvedValue({
      name: 'Other',
      gender: 'Female',
      motivation: 'Keep the ledger',
      metrics: { arousal: 80, autonomy: 25, competence: 40, relatedness: 15 },
    })

    const result = await generateCharacterMissingFields(
      { projectId: PROJECT_ID, filled: draft({ name: VERA, description: VERA_DESC }) },
      { generate, loadCanonPack }
    )

    expect(result.name).toBeUndefined()
    expect(result.gender).toBe('Female')
    expect(result.motivation).toBe('Keep the ledger')
    expect(Object.keys(result.metrics ?? {}).length).toBeLessThanOrEqual(4)
    expect(generate.mock.calls[0]?.[0]?.prompt).toContain(StoryCanonPackLabel.SeasonRoadmap)
    expect(generate.mock.calls[0]?.[0]?.prompt).toContain('Pilot')
  })

  it('wraps model failures', async () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined)
    loadCanonPack.mockResolvedValue(usablePack)
    generate.mockRejectedValue(new Error('quota'))

    await expect(
      generateCharacterMissingFields(
        { projectId: PROJECT_ID, filled: draft({ name: VERA }) },
        { generate, loadCanonPack }
      )
    ).rejects.toBeInstanceOf(GenerateCharacterFieldsError)
    errorSpy.mockRestore()
  })

  it('emits OpenAI-compatible required keys for metrics', () => {
    const json = recordFromJson(zodSchema(generatedCharacterFieldsLlmSchema).jsonSchema)
    const metrics = recordFromJson(recordFromJson(json.properties).metrics)
    const rootRequired = Array.isArray(json.required) ? json.required : []
    const metricRequired = Array.isArray(metrics.required) ? metrics.required : []
    expect(rootRequired).toContain('metrics')
    expect(metricRequired).toEqual([
      CharacterMetricFieldKey.Valence,
      CharacterMetricFieldKey.Arousal,
      CharacterMetricFieldKey.PerceivedStakes,
      CharacterMetricFieldKey.MoralAlignment,
    ])
  })
})
