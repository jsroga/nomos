export enum EpisodePremiseWriteField {
  Logline = 'logline',
}

export enum EpisodeDescriptionMarker {
  EpisodeDescription = 'episode description',
  GenerateDescription = 'generate description',
  RegenerateDescription = 'regenerate description',
  Logline = 'logline',
  WorldDescription = 'world description',
  Ozymandias = 'ozymandias',
  GeneratePremise = 'generate premise',
  GenerateAnEpisodePremise = 'generate an episode premise',
}

/** Description on the Plan tab is the logline — not the full Ozymandias premise. */
export function requestedEpisodePremiseField(text: string): string | undefined {
  const lower = text.toLowerCase()
  if (lower.includes(EpisodeDescriptionMarker.WorldDescription)) return undefined
  if (lower.includes(EpisodeDescriptionMarker.Ozymandias)) return undefined
  if (lower.includes(EpisodeDescriptionMarker.GenerateAnEpisodePremise)) return undefined
  if (lower.includes(EpisodeDescriptionMarker.GeneratePremise)) return undefined
  if (lower.includes(EpisodeDescriptionMarker.Logline)) return EpisodePremiseWriteField.Logline
  if (lower.includes(EpisodeDescriptionMarker.EpisodeDescription)) {
    return EpisodePremiseWriteField.Logline
  }
  if (lower.includes(EpisodeDescriptionMarker.GenerateDescription)) {
    return EpisodePremiseWriteField.Logline
  }
  if (lower.includes(EpisodeDescriptionMarker.RegenerateDescription)) {
    return EpisodePremiseWriteField.Logline
  }
  return undefined
}

export function narrowPremiseRecord(
  premise: Record<string, unknown>,
  field: string | undefined,
): Record<string, unknown> {
  if (!field) return premise
  const value = premise[field]
  if (value === undefined) return premise
  return { [field]: value }
}
