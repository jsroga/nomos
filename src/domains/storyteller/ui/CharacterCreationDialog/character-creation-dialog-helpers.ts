import { readNumber, readString } from '@/shared/data/json-guards'
import { CHARACTER_DIALOG_METRIC_KEYS } from '@/domains/storyteller/core/character-missing-fields'
import {
  CHARACTER_DIALOG_SUBMIT_CONVERT,
  CHARACTER_DIALOG_SUBMIT_CREATE,
  CHARACTER_DIALOG_SUBMIT_SAVE,
  CHARACTER_DIALOG_TITLE_CONVERT,
  CHARACTER_DIALOG_TITLE_CREATE,
  CHARACTER_DIALOG_TITLE_EDIT,
  CharacterDialogMode,
} from './constants/character-creation-dialog'
import {
  CharacterMetrics,
  InitialCharacterData,
  INITIAL_METRICS,
} from './character-creation-dialog-types'

export interface CharacterFormFields {
  name: string
  gender: string
  role: string
  description: string
  mbti: string
  portraitUrl: string
  motivation: string
  fatalFlaw: string
  secrets: string
  metrics: CharacterMetrics
}

export function mergeCharacterMetrics(
  prev: CharacterMetrics,
  patch: Record<string, unknown>,
): CharacterMetrics {
  const next = { ...prev }
  for (const key of CHARACTER_DIALOG_METRIC_KEYS) {
    const value = readNumber(patch[key])
    if (value !== undefined) next[key] = value
  }
  return next
}

export function metricsFromInitialData(
  initialData: InitialCharacterData,
  prev: CharacterMetrics
): CharacterMetrics {
  return {
    ...prev,
    ...(initialData.valence !== undefined && { valence: initialData.valence }),
    ...(initialData.arousal !== undefined && { arousal: initialData.arousal }),
    ...(initialData.autonomy !== undefined && { autonomy: initialData.autonomy }),
    ...(initialData.competence !== undefined && { competence: initialData.competence }),
    ...(initialData.relatedness !== undefined && { relatedness: initialData.relatedness }),
    ...(initialData.cognitiveClarity !== undefined && {
      cognitiveClarity: initialData.cognitiveClarity,
    }),
    ...(initialData.perceivedStakes !== undefined && {
      perceivedStakes: initialData.perceivedStakes,
    }),
    ...(initialData.socialSafety !== undefined && { socialSafety: initialData.socialSafety }),
    ...(initialData.moralAlignment !== undefined && {
      moralAlignment: initialData.moralAlignment,
    }),
  }
}

export function psychologyFieldsFromInitialData(initialData: InitialCharacterData) {
  const psych = initialData.psychology ?? {}
  return {
    motivation: initialData.motivation || readString(psych.actualMotivation) || '',
    fatalFlaw: initialData.fatalFlaw || readString(psych.fatalFlaw) || '',
    secrets: initialData.secrets || readString(psych.secrets) || '',
  }
}

export function buildCharacterPayload(fields: CharacterFormFields): Record<string, unknown> {
  const {
    name,
    gender,
    role,
    description,
    mbti,
    portraitUrl,
    motivation,
    fatalFlaw,
    secrets,
    metrics,
  } = fields

  return {
    name,
    gender,
    description,
    mbti,
    portraitUrl,
    ...metrics,
    role,
    transformation: 0,
    characterPrompt: `You are ${name}. ${description}`,
    psychology: {
      ...(motivation ? { actualMotivation: motivation } : {}),
      ...(fatalFlaw ? { fatalFlaw } : {}),
      ...(secrets ? { secrets } : {}),
    },
  }
}

export function getDialogTitle(
  mode: CharacterDialogMode,
  hasInitialData: boolean
): string {
  if (mode === CharacterDialogMode.Edit) return CHARACTER_DIALOG_TITLE_EDIT
  if (hasInitialData) return CHARACTER_DIALOG_TITLE_CONVERT
  return CHARACTER_DIALOG_TITLE_CREATE
}

export function getSubmitLabel(
  mode: CharacterDialogMode,
  hasInitialData: boolean
): string {
  if (mode === CharacterDialogMode.Edit) return CHARACTER_DIALOG_SUBMIT_SAVE
  if (hasInitialData) return CHARACTER_DIALOG_SUBMIT_CONVERT
  return CHARACTER_DIALOG_SUBMIT_CREATE
}

export function resetFormFields(): CharacterFormFields {
  return {
    name: '',
    gender: '',
    role: '',
    description: '',
    mbti: '',
    portraitUrl: '',
    motivation: '',
    fatalFlaw: '',
    secrets: '',
    metrics: { ...INITIAL_METRICS },
  }
}
