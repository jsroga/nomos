/** Generatable slices the ContinuityCritic can check against related canon. */
export enum AlignmentSection {
  WorldDescription = 'worldDescription',
  WorldRules = 'worldRules',
  Factions = 'factions',
  Inspirations = 'inspirations',
  PlotTwists = 'plotTwists',
  EpisodeRoadmap = 'episodeRoadmap',
  Cast = 'cast',
  Items = 'items',
  Events = 'events',
  EpisodePremise = 'episodePremise',
  Soundtracks = 'soundtracks',
  Beats = 'beats',
}

export enum AlignmentMatchBy {
  None = 'none',
  EpisodeSequence = 'episodeSequence',
}

export interface AlignmentRule {
  section: AlignmentSection
  related: readonly AlignmentSection[]
  matchBy: AlignmentMatchBy
  granularity: string
}

export enum AlignmentGranularity {
  WorldDescription = 'world-level setting prose; must not contradict rules, factions, or cast',
  WorldRules = 'binding world laws; must not contradict the world description',
  Factions = 'power structures; must fit the world description and rules',
  Inspirations = 'reference works; must not overwrite canon facts',
  PlotTwists = 'season-level turns; must not contradict the roadmap spine',
  EpisodeRoadmap = 'high-level season spine (8-12 slots: title, logline, inciting/midpoint/finale). Must not copy episode 10-point plans or beat loglines. Slot N restates episode N at altitude when that episode exists.',
  Cast = 'project-level characters; must not contradict the world description',
  Items = 'notable objects; must fit world rules and description',
  Events = 'status-quo-breaking events; must fit the world description',
  EpisodePremise = 'episode-level expansion of roadmap slot N (Ozymandias + 10-point). More detailed than the slot; must not invent a different A-plot.',
  Soundtracks = 'mood tracks; must not contradict stated world tone',
  Beats = 'scene-level split of the episode; the episode expands roadmap slot N. Cover the 10-point plan without contradicting the slot.',
}

export enum AlignmentScanLabel {
  Section = 'SECTION',
  Related = 'RELATED',
  Granularity = 'GRANULARITY',
  Episode = 'EPISODE',
}

export const ALIGNMENT_SCAN_INSTRUCTIONS =
  'Diagnose section alignment and granularity drift as well as continuity. Quote verbatim. Do not rewrite prose. Set patchable false when a fix would create or delete a beat or card.'

export const ALIGNMENT_REGISTRY: readonly AlignmentRule[] = [
  {
    section: AlignmentSection.WorldDescription,
    related: [AlignmentSection.WorldRules, AlignmentSection.Factions, AlignmentSection.Cast],
    matchBy: AlignmentMatchBy.None,
    granularity: AlignmentGranularity.WorldDescription,
  },
  {
    section: AlignmentSection.WorldRules,
    related: [AlignmentSection.WorldDescription],
    matchBy: AlignmentMatchBy.None,
    granularity: AlignmentGranularity.WorldRules,
  },
  {
    section: AlignmentSection.Factions,
    related: [AlignmentSection.WorldDescription, AlignmentSection.WorldRules],
    matchBy: AlignmentMatchBy.None,
    granularity: AlignmentGranularity.Factions,
  },
  {
    section: AlignmentSection.Inspirations,
    related: [AlignmentSection.WorldDescription],
    matchBy: AlignmentMatchBy.None,
    granularity: AlignmentGranularity.Inspirations,
  },
  {
    section: AlignmentSection.PlotTwists,
    related: [AlignmentSection.EpisodeRoadmap, AlignmentSection.WorldDescription],
    matchBy: AlignmentMatchBy.None,
    granularity: AlignmentGranularity.PlotTwists,
  },
  {
    section: AlignmentSection.EpisodeRoadmap,
    related: [AlignmentSection.WorldDescription, AlignmentSection.Cast, AlignmentSection.EpisodePremise],
    matchBy: AlignmentMatchBy.None,
    granularity: AlignmentGranularity.EpisodeRoadmap,
  },
  {
    section: AlignmentSection.Cast,
    related: [AlignmentSection.WorldDescription],
    matchBy: AlignmentMatchBy.None,
    granularity: AlignmentGranularity.Cast,
  },
  {
    section: AlignmentSection.Items,
    related: [AlignmentSection.WorldDescription, AlignmentSection.WorldRules],
    matchBy: AlignmentMatchBy.None,
    granularity: AlignmentGranularity.Items,
  },
  {
    section: AlignmentSection.Events,
    related: [AlignmentSection.WorldDescription],
    matchBy: AlignmentMatchBy.None,
    granularity: AlignmentGranularity.Events,
  },
  {
    section: AlignmentSection.Soundtracks,
    related: [AlignmentSection.WorldDescription],
    matchBy: AlignmentMatchBy.None,
    granularity: AlignmentGranularity.Soundtracks,
  },
  {
    section: AlignmentSection.EpisodePremise,
    related: [AlignmentSection.EpisodeRoadmap, AlignmentSection.WorldDescription, AlignmentSection.Cast],
    matchBy: AlignmentMatchBy.EpisodeSequence,
    granularity: AlignmentGranularity.EpisodePremise,
  },
  {
    section: AlignmentSection.Beats,
    related: [AlignmentSection.EpisodePremise, AlignmentSection.EpisodeRoadmap],
    matchBy: AlignmentMatchBy.EpisodeSequence,
    granularity: AlignmentGranularity.Beats,
  },
]
