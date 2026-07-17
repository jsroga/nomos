import type { StorytellerCharacter } from '@/domains/storyteller/core/entities/character-wire'
import { readCharacterMetric } from '@/domains/storyteller/core/entities/character-wire'
import {
  CHARACTER_METRIC_CONFIG,
  CharacterMetricKey,
} from '@/domains/storyteller/ui/CharacterPanel/constants/character-panel-metrics'

export const isMetricHighRisk = (key: CharacterMetricKey, value: number): boolean => {
  if (key === CharacterMetricKey.Valence && value < -50) return true
  if (key === CharacterMetricKey.Autonomy && value < 25) return true
  if (key === CharacterMetricKey.SocialSafety && value < 25) return true
  if (key === CharacterMetricKey.PerceivedStakes && value > 85) return true
  if (key === CharacterMetricKey.MoralAlignment && value < 25) return true
  return false
}

export const getMetricDisplayValues = (
  character: StorytellerCharacter,
  key: CharacterMetricKey,
  isValence: boolean
) => {
  const rawValue = readCharacterMetric(character, key)
  const defaultValue = isValence ? 0 : 50
  const value = typeof rawValue === 'number' ? rawValue : defaultValue
  const displayPercentage = isValence ? (value + 100) / 2 : value
  const displayValue = isValence ? `${value > 0 ? '+' : ''}${value}` : `${value}%`

  return { value, displayPercentage, displayValue }
}

export const getMetricBarColor = (
  isHighRisk: boolean,
  isValence: boolean,
  value: number,
  displayPercentage: number
): string | undefined => {
  if (isHighRisk) return undefined
  if (isValence) {
    const normalizedValue = (value + 100) / 200
    const hue = Math.round(normalizedValue * 120)
    return `hsl(${hue}, 70%, 50%)`
  }
  return `hsl(var(--primary) / ${0.4 + displayPercentage / 166})`
}

export { CHARACTER_METRIC_CONFIG }
