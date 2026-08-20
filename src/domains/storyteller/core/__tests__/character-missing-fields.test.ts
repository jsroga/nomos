import { describe, expect, it } from 'vitest'
import {
  applyGeneratedCharacterFields,
  capGeneratedMetrics,
  CHARACTER_DIALOG_METRIC_KEYS,
  CHARACTER_MISSING_METRICS_MAX,
  CharacterMetricFieldKey,
  CharacterTextFieldKey,
  DEFAULT_CHARACTER_METRICS,
  generatedCharacterFieldsFromUnknown,
  hasMissingCharacterFields,
  hasUsableCharacterDraft,
  listMissingCharacterMetricKeys,
  listMissingCharacterTextFields,
  mergeNonBlankCharacterDraft,
  stripFilledGeneratedFields,
  type CharacterFilledDraft,
} from '../character-missing-fields'

const VERA = 'Vera'
const VERA_DESC = 'Vera keeps the wardens at bay.'
const INTJ = 'INTJ'

function draft(overrides: Partial<CharacterFilledDraft> = {}): CharacterFilledDraft {
  return {
    name: '',
    gender: '',
    role: '',
    description: '',
    mbti: '',
    motivation: '',
    fatalFlaw: '',
    secrets: '',
    metrics: { ...DEFAULT_CHARACTER_METRICS },
    ...overrides,
  }
}

describe('character-missing-fields', () => {
  it('lists empty text fields including role', () => {
    const missing = listMissingCharacterTextFields(draft())
    expect(missing).toContain(CharacterTextFieldKey.Name)
    expect(missing).toContain(CharacterTextFieldKey.Description)
    expect(missing).toContain(CharacterTextFieldKey.Role)
    expect(missing).toContain(CharacterTextFieldKey.Gender)
  })

  it('does not treat a named draft as empty grounding', () => {
    expect(hasUsableCharacterDraft(draft({ name: VERA }))).toBe(true)
    expect(hasUsableCharacterDraft(draft())).toBe(false)
  })

  it('does not overwrite filled strings when applying generated fields', () => {
    const current = draft({ name: VERA, description: VERA_DESC, mbti: INTJ })
    const next = applyGeneratedCharacterFields(current, {
      name: 'Other',
      description: 'Replaced',
      mbti: 'ENFP',
      motivation: 'Protect the ward',
    })
    expect(next.name).toBe(VERA)
    expect(next.description).toBe(VERA_DESC)
    expect(next.mbti).toBe(INTJ)
    expect(next.motivation).toBe('Protect the ward')
  })

  it('keeps snapshot strings when live is blank', () => {
    const snapshot = draft({ name: VERA, description: VERA_DESC })
    const live = draft()
    const merged = mergeNonBlankCharacterDraft(snapshot, live)
    expect(merged.name).toBe(VERA)
    expect(merged.description).toBe(VERA_DESC)
  })

  it('caps generated metrics at the four dialog sliders and skips customized ones', () => {
    const current = draft({
      metrics: { ...DEFAULT_CHARACTER_METRICS, valence: -40 },
    })
    const capped = capGeneratedMetrics(
      {
        [CharacterMetricFieldKey.Valence]: 10,
        [CharacterMetricFieldKey.Arousal]: 80,
        [CharacterMetricFieldKey.Autonomy]: 20,
        [CharacterMetricFieldKey.Competence]: 30,
        [CharacterMetricFieldKey.Relatedness]: 40,
        [CharacterMetricFieldKey.PerceivedStakes]: 90,
      },
      current.metrics
    )
    expect(capped[CharacterMetricFieldKey.Valence]).toBeUndefined()
    expect(capped[CharacterMetricFieldKey.Autonomy]).toBeUndefined()
    expect(capped[CharacterMetricFieldKey.Arousal]).toBe(80)
    expect(capped[CharacterMetricFieldKey.PerceivedStakes]).toBe(90)
    expect(Object.keys(capped).length).toBeLessThanOrEqual(CHARACTER_MISSING_METRICS_MAX)
  })

  it('strips filled keys from a model payload', () => {
    const filled = draft({ name: VERA })
    const stripped = stripFilledGeneratedFields(filled, {
      name: 'Other',
      gender: 'Female',
      metrics: { arousal: 88, autonomy: 12, competence: 15, relatedness: 22, perceivedStakes: 70 },
    })
    expect(stripped.name).toBeUndefined()
    expect(stripped.gender).toBe('Female')
    expect(stripped.metrics?.arousal).toBe(88)
    expect(stripped.metrics?.perceivedStakes).toBe(70)
    expect(stripped.metrics?.autonomy).toBeUndefined()
    expect(Object.keys(stripped.metrics ?? {}).length).toBeLessThanOrEqual(CHARACTER_MISSING_METRICS_MAX)
  })

  it('only treats the four dialog metrics as missing', () => {
    expect(listMissingCharacterMetricKeys(draft().metrics)).toEqual([...CHARACTER_DIALOG_METRIC_KEYS])
  })

  it('reports missing fields when metrics are still at defaults', () => {
    const completeText = draft({
      name: VERA,
      gender: 'Female',
      description: VERA_DESC,
      mbti: INTJ,
      motivation: 'Protect',
      fatalFlaw: 'Pride',
      secrets: 'Hidden ledger',
    })
    expect(hasMissingCharacterFields(completeText)).toBe(true)
    expect(listMissingCharacterMetricKeys(completeText.metrics).length).toBeGreaterThan(0)
  })

  it('parses unknown json without overwriting types', () => {
    const parsed = generatedCharacterFieldsFromUnknown({
      name: VERA,
      metrics: { arousal: 70, extra: 'nope' },
    })
    expect(parsed.name).toBe(VERA)
    expect(parsed.metrics?.arousal).toBe(70)
  })

  it('drops null structured-output placeholders', () => {
    const parsed = generatedCharacterFieldsFromUnknown({
      name: null,
      motivation: 'Protect',
      metrics: { valence: null, arousal: 80 },
    })
    expect(parsed.name).toBeUndefined()
    expect(parsed.motivation).toBe('Protect')
    expect(parsed.metrics?.valence).toBeUndefined()
    expect(parsed.metrics?.arousal).toBe(80)
  })
})
