export interface EpisodeRoadmapEpisode {
  id?: number | null
  name?: string | null
  description?: string | null
  mainPlotBeat?: string | null
  bPlotBeat?: string | null
  hook?: string | null
  cliffhanger?: string | null
  reasoning?: string | null
  keyFactionsInvolved?: string[] | null
  consequences?: string[] | null
  worldConsequence?: string | null
  title?: string | null
  logline?: string | null
  incitingIncident?: string | null
  midpoint?: string | null
  finale?: string | null
  protagonistHook?: string | null
  antagonistMove?: string | null
  fatalFlaw?: string | null
  thematicQuestion?: string | null
  thematicFocus?: string | null
  actStructure?: string | null
}

export interface ParsedDescriptionMeta {
  factions?: string
  focus?: string
  worldConsequence?: string
}

export interface ParsedDescription {
  cleanText: string
  extracted: ParsedDescriptionMeta
}
