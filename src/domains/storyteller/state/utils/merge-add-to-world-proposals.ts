import { BibleSection } from '@/domains/storyteller/core/types/enums'
import {
  bibleFieldsFromToolArgs,
  proposalsFromWrittenBibleFields,
  type ProposedBibleSectionUpdate,
} from '@/domains/storyteller/state/utils/propose-assistant-bible-update'
import type { StreamAgentAction } from '@/domains/storyteller/core/types/action-types'
import { recordFromJson } from '@/shared/data/json-guards'

export enum BibleSectionDisplayName {
  Overview = 'Overview',
  Factions = 'Factions',
  PlotTwists = 'Plot twists',
  WorldRules = 'World rules',
  Items = 'Items',
  Events = 'Events',
  Inspirations = 'Inspirations',
  Soundtracks = 'Soundtracks',
  EpisodePremise = 'Episode premise',
  EpisodeRoadmap = 'Episode roadmap',
  Cast = 'Cast',
  Moodboard = 'Moodboard',
}

export enum SectionListJoin {
  CommaSpace = ', ',
}

export const BIBLE_SECTION_DISPLAY_NAME = {
  [BibleSection.WORLD_DESCRIPTION]: BibleSectionDisplayName.Overview,
  [BibleSection.FACTIONS]: BibleSectionDisplayName.Factions,
  [BibleSection.PLOT_TWISTS]: BibleSectionDisplayName.PlotTwists,
  [BibleSection.WORLD_RULES]: BibleSectionDisplayName.WorldRules,
  [BibleSection.ITEMS]: BibleSectionDisplayName.Items,
  [BibleSection.EVENTS]: BibleSectionDisplayName.Events,
  [BibleSection.INSPIRATIONS]: BibleSectionDisplayName.Inspirations,
  [BibleSection.SOUNDTRACKS]: BibleSectionDisplayName.Soundtracks,
  [BibleSection.EPISODE_PREMISE]: BibleSectionDisplayName.EpisodePremise,
  [BibleSection.EPISODE_ROADMAP]: BibleSectionDisplayName.EpisodeRoadmap,
  [BibleSection.CAST]: BibleSectionDisplayName.Cast,
  [BibleSection.MOODBOARD]: BibleSectionDisplayName.Moodboard,
} as const

export function bibleSectionDisplayName(section: string): string {
  for (const [key, label] of Object.entries(BIBLE_SECTION_DISPLAY_NAME)) {
    if (key === section) return label
  }
  return section
}

export function formatBibleSectionList(sections: readonly string[]): string {
  return sections.map(bibleSectionDisplayName).join(SectionListJoin.CommaSpace)
}

export function mergeToolArgFields(
  toolArgs: readonly Record<string, unknown>[],
): Record<string, unknown> {
  const merged: Record<string, unknown> = {}
  for (const args of toolArgs) {
    Object.assign(merged, bibleFieldsFromToolArgs(args))
  }
  return merged
}

/** Beat/script tool payloads have args but no bible fields — do not dump chat into Overview. */
export function isNonBibleToolPayload(toolArgs: readonly Record<string, unknown>[]): boolean {
  return toolArgs.length > 0 && Object.keys(mergeToolArgFields(toolArgs)).length === 0
}

export function addToWorldSectionLabels(input: {
  toolArgs: readonly Record<string, unknown>[]
  episodeId?: string | null
  requestedSection?: string
  rejectedSections: ReadonlySet<string>
}): string[] {
  return proposalsFromWrittenBibleFields(
    mergeToolArgFields(input.toolArgs),
    input.episodeId,
    input.requestedSection,
  )
    .filter(proposal => !input.rejectedSections.has(proposal.section))
    .map(proposal => bibleSectionDisplayName(proposal.section))
}

export function mergeAddToWorldProposals(input: {
  toolProposals: readonly ProposedBibleSectionUpdate[]
  pending: Record<string, { section: string; preview: unknown; action: StreamAgentAction }>
  rejectedSections: ReadonlySet<string>
}): ProposedBibleSectionUpdate[] {
  const bySection = new Map<string, ProposedBibleSectionUpdate>()
  for (const proposal of input.toolProposals) {
    if (input.rejectedSections.has(proposal.section)) continue
    bySection.set(proposal.section, proposal)
  }
  for (const pending of Object.values(input.pending)) {
    if (input.rejectedSections.has(pending.section)) continue
    bySection.set(pending.section, {
      section: pending.section,
      preview: recordFromJson(pending.preview),
      action: pending.action,
      dedupeKey: `pending:${pending.section}`,
    })
  }
  return Array.from(bySection.values())
}
