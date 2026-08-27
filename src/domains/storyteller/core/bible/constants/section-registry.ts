/** Vocabulary for SECTION_REGISTRY. Values only — no logic. */

export enum SectionOwner {
  /** World-level: belongs on the bible, never on `episodes.story_plan`. */
  Bible = 'bible',
  /** Belongs to a single episode. */
  Episode = 'episode',
}

export enum MergeStrategy {
  /** A regenerate swaps the collection for a fresh one. */
  Replace = 'replace',
  /** A regenerate adds to what is there, keyed by identity. */
  Append = 'append',
  /** Objects: the new value wins field by field, untouched keys survive. */
  Deep = 'deep',
  /** Scalars: the new value replaces the old outright. */
  Overwrite = 'overwrite',
}

/** Human-facing name for each world section. */
export enum SectionLabel {
  WorldDescription = 'World description',
  WorldRules = 'World rules',
  Factions = 'Factions',
  Inspirations = 'Inspirations',
  PlotTwists = 'Plot twists',
  EpisodeRoadmap = 'Episode roadmap',
  Cast = 'Cast',
  Soundtracks = 'Soundtracks',
  Moodboard = 'Moodboard',
  Items = 'Items',
  Events = 'Events',
}

/**
 * Why a section does not hydrate. A defect and a decision look identical in
 * code, so each one has to say which it is.
 */
export const SECTION_NOT_HYDRATED_REASON = {
  Moodboard:
    'No UI consumer reads `moodboard` off plan state as of 2026-08-27; MoodboardImagesSection reads `moodImages`, which does hydrate.',
  Items:
    'DEFECT, not a decision: BibleItems.tsx reads storyPlan.items but the field never hydrates. Same shape as the plot-twist bug. Flip to true and add a regression test.',
  Events:
    'DEFECT, not a decision: BibleEvents.tsx reads storyPlan.events but the field never hydrates.',
} as const
