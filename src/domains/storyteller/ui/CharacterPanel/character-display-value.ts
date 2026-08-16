import { CharacterMissingValue, CharacterUnsetSentinel } from './constants/character-panel-metrics'

const UNSET_VALUES = new Set<string>([
  CharacterUnsetSentinel.Empty,
  CharacterUnsetSentinel.QuestionMarks,
  CharacterUnsetSentinel.QuestionMarksShort,
  CharacterUnsetSentinel.UndefinedLower,
  CharacterUnsetSentinel.UndefinedTitle,
])

export function characterDisplayValue(value: string | undefined): string {
  const trimmed = value?.trim() ?? CharacterUnsetSentinel.Empty
  if (UNSET_VALUES.has(trimmed)) return CharacterMissingValue.Dash
  return trimmed
}
