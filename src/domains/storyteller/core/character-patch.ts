import { z } from 'zod'

export enum CharacterPatchField {
  Id = 'id',
  Name = 'name',
  Role = 'role',
  Gender = 'gender',
  CharacterPrompt = 'characterPrompt',
  Mbti = 'mbti',
  Psychology = 'psychology',
  Description = 'description',
  PortraitUrl = 'portraitUrl',
  Morality = 'morality',
  Transformation = 'transformation',
  Stress = 'stress',
  Trust = 'trust',
  Power = 'power',
  Isolation = 'isolation',
}

const optionalText = z.string().nullable().optional()
const optionalNumber = z.number().optional()

export const characterPatchRequestSchema = z.object({
  [CharacterPatchField.Id]: z.string().min(1).optional(),
  [CharacterPatchField.Name]: optionalText,
  [CharacterPatchField.Role]: optionalText,
  [CharacterPatchField.Gender]: optionalText,
  [CharacterPatchField.CharacterPrompt]: optionalText,
  [CharacterPatchField.Mbti]: optionalText,
  [CharacterPatchField.Psychology]: z.unknown().optional(),
  [CharacterPatchField.Description]: optionalText,
  [CharacterPatchField.PortraitUrl]: optionalText,
  [CharacterPatchField.Morality]: optionalNumber,
  [CharacterPatchField.Transformation]: optionalNumber,
  [CharacterPatchField.Stress]: optionalNumber,
  [CharacterPatchField.Trust]: optionalNumber,
  [CharacterPatchField.Power]: optionalNumber,
  [CharacterPatchField.Isolation]: optionalNumber,
})

export type CharacterPatchRequest = z.infer<typeof characterPatchRequestSchema>

export function characterPatchRequestRecord(body: CharacterPatchRequest): Record<string, unknown> {
  const record: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(body)) {
    if (value !== undefined) record[key] = value
  }
  return record
}

function assignDirectCharacterFields(
  body: Record<string, unknown>,
  dbUpdates: Record<string, unknown>
): void {
  if (body[CharacterPatchField.Name] !== undefined) dbUpdates.name = body[CharacterPatchField.Name]
  if (body[CharacterPatchField.Role] !== undefined) dbUpdates.role = body[CharacterPatchField.Role]
  if (body[CharacterPatchField.Gender] !== undefined)
    dbUpdates.gender = body[CharacterPatchField.Gender]
  if (body[CharacterPatchField.CharacterPrompt] !== undefined)
    dbUpdates.characterPrompt = body[CharacterPatchField.CharacterPrompt]
  if (body[CharacterPatchField.Mbti] !== undefined) dbUpdates.mbti = body[CharacterPatchField.Mbti]
  if (body[CharacterPatchField.Psychology] !== undefined)
    dbUpdates.psychology = body[CharacterPatchField.Psychology]
  if (body[CharacterPatchField.Description] !== undefined)
    dbUpdates.description = body[CharacterPatchField.Description]
  if (body[CharacterPatchField.PortraitUrl] !== undefined)
    dbUpdates.portraitUrl = body[CharacterPatchField.PortraitUrl]
}

function assignCharacterMetricFields(
  body: Record<string, unknown>,
  dbUpdates: Record<string, unknown>
): void {
  if (body[CharacterPatchField.Morality] !== undefined)
    dbUpdates.moralAlignment = body[CharacterPatchField.Morality]
  if (body[CharacterPatchField.Transformation] !== undefined)
    dbUpdates.transformationProgress = body[CharacterPatchField.Transformation]
  if (body[CharacterPatchField.Stress] !== undefined)
    dbUpdates.arousal = body[CharacterPatchField.Stress]
  if (body[CharacterPatchField.Trust] !== undefined)
    dbUpdates.socialSafety = body[CharacterPatchField.Trust]
  if (body[CharacterPatchField.Power] !== undefined)
    dbUpdates.autonomy = Math.floor(Number(body[CharacterPatchField.Power]) * 0.6 + 20)
  if (body[CharacterPatchField.Isolation] !== undefined)
    dbUpdates.relatedness = 100 - Number(body[CharacterPatchField.Isolation])
}

/** Columns a PATCH caller may write. Identity and tenancy keys are omitted from the write set. */
export function buildCharacterPatchUpdates(body: Record<string, unknown>) {
  const dbUpdates: Record<string, unknown> = {}
  assignDirectCharacterFields(body, dbUpdates)
  assignCharacterMetricFields(body, dbUpdates)
  return dbUpdates
}
