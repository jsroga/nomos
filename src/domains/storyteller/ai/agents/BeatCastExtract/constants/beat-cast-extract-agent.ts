export enum BeatCastExtractAgentId {
  BeatCastExtract = 'beat-cast-extract',
}

export enum BeatCastExtractAgentLabel {
  BeatCastExtract = 'Beat Cast Extract',
}

export enum BeatCastExtractCopy {
  Instructions = `You list which existing series characters are visibly present in a story beat.
Return only names from the roster, spelled exactly as in the roster.
If the beat is a landscape, object, or crowd with no named roster character, return an empty names array.
Never invent names. Never include aliases that are not on the roster.`,
}

export enum BeatCastExtractPromptLabel {
  Roster = 'ROSTER (only these names are allowed)',
  Hinted = 'HINTED NAMES FROM THE BEAT RECORD',
  Beat = 'BEAT',
  None = '(none)',
}
