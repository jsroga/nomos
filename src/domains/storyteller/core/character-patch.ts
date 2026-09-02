function assignDirectCharacterFields(
  body: Record<string, unknown>,
  dbUpdates: Record<string, unknown>
): void {
  if (body.name !== undefined) dbUpdates.name = body.name
  if (body.role !== undefined) dbUpdates.role = body.role
  if (body.gender !== undefined) dbUpdates.gender = body.gender
  if (body.characterPrompt !== undefined) dbUpdates.characterPrompt = body.characterPrompt
  if (body.mbti !== undefined) dbUpdates.mbti = body.mbti
  if (body.psychology !== undefined) dbUpdates.psychology = body.psychology
  if (body.description !== undefined) dbUpdates.description = body.description
  if (body.portraitUrl !== undefined) dbUpdates.portraitUrl = body.portraitUrl
}

function assignCharacterMetricFields(
  body: Record<string, unknown>,
  dbUpdates: Record<string, unknown>
): void {
  if (body.morality !== undefined) dbUpdates.moralAlignment = body.morality
  if (body.transformation !== undefined) dbUpdates.transformationProgress = body.transformation
  if (body.stress !== undefined) dbUpdates.arousal = body.stress
  if (body.trust !== undefined) dbUpdates.socialSafety = body.trust
  if (body.power !== undefined) dbUpdates.autonomy = Math.floor(Number(body.power) * 0.6 + 20)
  if (body.isolation !== undefined) dbUpdates.relatedness = 100 - Number(body.isolation)
}

/** Columns a PATCH caller may write. Identity and tenancy keys are omitted. */
export function buildCharacterPatchUpdates(body: Record<string, unknown>) {
  const dbUpdates: Record<string, unknown> = {}
  assignDirectCharacterFields(body, dbUpdates)
  assignCharacterMetricFields(body, dbUpdates)
  return dbUpdates
}
