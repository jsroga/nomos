/**
 * The single declaration of a world-bible section.
 *
 * Four hand-kept lists used to have to agree, and when one drifted a section
 * silently stopped appearing — soundtracks, then factions, then plot twists,
 * then the roadmap. Everything is derived from here instead, and the type is
 * `Record<WorldBibleSection, SectionSpec>`, so a new section that is not
 * declared does not compile.
 */
import { BibleSection } from '@/domains/storyteller/core/types/enums'
import {
  CanonLayer,
  MergeStrategy,
  SECTION_NOT_HYDRATED_REASON,
  SectionLabel,
  SectionOwner,
} from '@/domains/storyteller/core/bible/constants/section-registry'
import { CastFieldAlias } from '@/domains/storyteller/core/formatting/constants/story-plan-fields'
import { SoundtrackFieldAlias } from '@/domains/storyteller/config/constants/bible-wire-fields'

/** Belongs to one episode, not the world. */
const EPISODE_OWNED_SECTIONS = [BibleSection.EPISODE_PREMISE] as const
/** Not a section — the catch-all bucket for unrecognised tool fields. */
const NON_SECTIONS = [BibleSection.FULL] as const

type ExcludedSection = (typeof EPISODE_OWNED_SECTIONS)[number] | (typeof NON_SECTIONS)[number]

/** Every `BibleSection` that describes world-level content. */
export type WorldBibleSection = Exclude<BibleSection, ExcludedSection>

export const WORLD_BIBLE_SECTIONS: WorldBibleSection[] = Object.values(BibleSection).filter(
  (section): section is WorldBibleSection =>
    !EPISODE_OWNED_SECTIONS.some(excluded => excluded === section) &&
    !NON_SECTIONS.some(excluded => excluded === section)
)

export interface SectionSpec {
  readonly owner: SectionOwner
  readonly merge: MergeStrategy
  readonly canonLayer: CanonLayer
  /** Whether the section reaches UI state through the hydration pass. */
  readonly hydrates: boolean
  /**
   * Required when `hydrates` is false. Says whether that is intentional, so a
   * reader can tell a decision from an oversight — which is the distinction
   * this whole registry exists to restore.
   */
  readonly why?: string
  /**
   * The spelling this section's content reaches UI state under, when it differs
   * from the section key. `cast` hydrates as `keyCharacters`.
   */
  readonly hydratesAs?: string
  /**
   * Extra wire spellings that are also bible-owned. Each says whether it
   * carries into UI state on its own — `moodSoundtrack` is a separate field of
   * the soundtracks section, not another name for it. Retired on evidence.
   */
  readonly aliases?: Readonly<Record<string, { hydrates: boolean }>>
  readonly label: string
}

/**
 * World-level fields that are not sections — story-plan scalars with no panel
 * of their own. The registry could not hold them: they are not `BibleSection`
 * members, and adding them would change what that enum means to the tool layer.
 * Declared here so the derivation below is complete rather than nearly so.
 */
export const WORLD_SCALAR_FIELDS: Record<string, { hydrates: boolean }> = {
  moodImages: { hydrates: true },
  genre: { hydrates: true },
  tone: { hydrates: true },
  centralTheme: { hydrates: true },
  masterPrompt: { hydrates: true },
  sequences: { hydrates: true },
  seasonStructure: { hydrates: true },
  executiveSummary: { hydrates: true },
}

/**
 * Values read off the four lists this replaces — this declaration invents no
 * behaviour. Where `hydrates` is false because of a known defect rather than a
 * decision, `why` says so, and fixing it is a one-word change here.
 */
export const SECTION_REGISTRY: Record<WorldBibleSection, SectionSpec> = {
  [BibleSection.WORLD_DESCRIPTION]: {
    owner: SectionOwner.Bible,
    merge: MergeStrategy.Overwrite,
    canonLayer: CanonLayer.StoryFacts,
    hydrates: true,
    label: SectionLabel.WorldDescription,
  },
  [BibleSection.WORLD_RULES]: {
    owner: SectionOwner.Bible,
    merge: MergeStrategy.Replace,
    canonLayer: CanonLayer.StoryFacts,
    hydrates: true,
    label: SectionLabel.WorldRules,
  },
  [BibleSection.FACTIONS]: {
    owner: SectionOwner.Bible,
    merge: MergeStrategy.Replace,
    canonLayer: CanonLayer.StoryFacts,
    hydrates: true,
    label: SectionLabel.Factions,
  },
  [BibleSection.INSPIRATIONS]: {
    owner: SectionOwner.Bible,
    merge: MergeStrategy.Deep,
    canonLayer: CanonLayer.StoryFacts,
    hydrates: true,
    label: SectionLabel.Inspirations,
  },
  [BibleSection.PLOT_TWISTS]: {
    owner: SectionOwner.Bible,
    merge: MergeStrategy.Replace,
    canonLayer: CanonLayer.AuthorTruth,
    hydrates: true,
    label: SectionLabel.PlotTwists,
  },
  [BibleSection.EPISODE_ROADMAP]: {
    owner: SectionOwner.Bible,
    merge: MergeStrategy.Deep,
    canonLayer: CanonLayer.RevealBoundary,
    hydrates: true,
    label: SectionLabel.EpisodeRoadmap,
  },
  [BibleSection.CAST]: {
    owner: SectionOwner.Bible,
    merge: MergeStrategy.Replace,
    canonLayer: CanonLayer.CharacterKnowledge,
    hydrates: true,
    hydratesAs: CastFieldAlias.KeyCharacters,
    label: SectionLabel.Cast,
  },
  [BibleSection.SOUNDTRACKS]: {
    owner: SectionOwner.Bible,
    merge: MergeStrategy.Replace,
    canonLayer: CanonLayer.StoryFacts,
    hydrates: true,
    aliases: { [SoundtrackFieldAlias.MoodSoundtrack]: { hydrates: true } },
    label: SectionLabel.Soundtracks,
  },
  [BibleSection.MOODBOARD]: {
    owner: SectionOwner.Bible,
    merge: MergeStrategy.Deep,
    canonLayer: CanonLayer.StoryFacts,
    hydrates: false,
    why: SECTION_NOT_HYDRATED_REASON.Moodboard,
    label: SectionLabel.Moodboard,
  },
  [BibleSection.ITEMS]: {
    owner: SectionOwner.Bible,
    merge: MergeStrategy.Replace,
    canonLayer: CanonLayer.StoryFacts,
    hydrates: true,
    label: SectionLabel.Items,
  },
  [BibleSection.EVENTS]: {
    owner: SectionOwner.Bible,
    merge: MergeStrategy.Replace,
    canonLayer: CanonLayer.StoryFacts,
    hydrates: true,
    label: SectionLabel.Events,
  },
}

export { CanonLayer, MergeStrategy, SectionOwner }

function sectionsWhere(predicate: (spec: SectionSpec) => boolean): WorldBibleSection[] {
  return WORLD_BIBLE_SECTIONS.filter(section => predicate(SECTION_REGISTRY[section]))
}

/**
 * Every key that belongs to the bible rather than to an episode: the sections
 * the bible owns, their extra wire spellings, and the world-level scalars.
 */
export function bibleOwnedPlanFields(): string[] {
  const owned = sectionsWhere(spec => spec.owner === SectionOwner.Bible)
  const aliases = owned.flatMap(section => Object.keys(SECTION_REGISTRY[section].aliases ?? {}))
  return [...owned, ...aliases, ...Object.keys(WORLD_SCALAR_FIELDS)]
}

/** Every key the hydration pass carries into UI state, under its hydrated name. */
export function hydrationPlanFields(): string[] {
  const sections = sectionsWhere(spec => spec.hydrates).map(
    section => SECTION_REGISTRY[section].hydratesAs ?? section
  )
  const aliases = WORLD_BIBLE_SECTIONS.flatMap(section =>
    Object.entries(SECTION_REGISTRY[section].aliases ?? {})
      .filter(([, alias]) => alias.hydrates)
      .map(([field]) => field)
  )
  const scalars = Object.entries(WORLD_SCALAR_FIELDS)
    .filter(([, spec]) => spec.hydrates)
    .map(([field]) => field)
  return [...sections, ...aliases, ...scalars]
}

/**
 * How a regenerate combines with what is already stored, for the sections the
 * registry declares. Returns undefined for the world-level scalars and the
 * episode-owned fields, which keep the caller's type-based default.
 */
export function mergeStrategyFor(field: string): MergeStrategy | undefined {
  const section = WORLD_BIBLE_SECTIONS.find(candidate => candidate === field)
  return section ? SECTION_REGISTRY[section].merge : undefined
}
