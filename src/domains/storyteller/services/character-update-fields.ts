import type { UpdateCharacterInput } from '@/domains/storyteller/services/storyteller-character-schema'

function assignCharacterIdentityFields(
  validated: UpdateCharacterInput,
  dbUpdates: Record<string, unknown>
): void {
  if (validated.name !== undefined) dbUpdates.name = validated.name
  if (validated.role !== undefined) dbUpdates.role = validated.role
  if (validated.gender !== undefined) dbUpdates.gender = validated.gender
  if (validated.characterPrompt !== undefined) dbUpdates.characterPrompt = validated.characterPrompt
  if (validated.description !== undefined) dbUpdates.description = validated.description
  if (validated.portraitUrl !== undefined) dbUpdates.portraitUrl = validated.portraitUrl
  if (validated.mbti !== undefined) dbUpdates.mbti = validated.mbti
  if (validated.psychology !== undefined) dbUpdates.psychology = validated.psychology
}

function assignCharacterMetricFields(
  validated: UpdateCharacterInput,
  dbUpdates: Record<string, unknown>
): void {
  if (validated.stress !== undefined) dbUpdates.stressLevel = validated.stress
  if (validated.trust !== undefined) dbUpdates.trustLevel = validated.trust
  if (validated.power !== undefined) dbUpdates.powerLevel = validated.power
  if (validated.morality !== undefined) dbUpdates.moralityLevel = validated.morality
  if (validated.hope !== undefined) dbUpdates.hopeLevel = validated.hope
  if (validated.isolation !== undefined) dbUpdates.isolationLevel = validated.isolation
  if (validated.transformation !== undefined) {
    dbUpdates.transformationProgress = validated.transformation
  }
}

export function buildCharacterDbUpdates(validated: UpdateCharacterInput): Record<string, unknown> {
  const dbUpdates: Record<string, unknown> = {}
  assignCharacterIdentityFields(validated, dbUpdates)
  assignCharacterMetricFields(validated, dbUpdates)
  return dbUpdates
}
