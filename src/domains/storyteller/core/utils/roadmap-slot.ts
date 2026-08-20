import { recordArrayFromJson, readString, recordFromJson } from '../../../../shared/data/json-guards'

export interface RoadmapSlot {
  id?: number | null
  name?: string | null
  title?: string | null
  description?: string | null
  logline?: string | null
  incitingIncident?: string | null
  midpoint?: string | null
  finale?: string | null
  hook?: string | null
  cliffhanger?: string | null
  thematicQuestion?: string | null
  thematicFocus?: string | null
  protagonistHook?: string | null
  antagonistMove?: string | null
  fatalFlaw?: string | null
  mainPlotBeat?: string | null
  bPlotBeat?: string | null
  reasoning?: string | null
  actStructure?: string | null
  keyFactionsInvolved?: string[] | null
  consequences?: string[] | null
  worldConsequence?: string | null
}

export enum RoadmapSlotCopy {
  ExpandPrefix = 'This is the high-level brief for episode ',
  ExpandSuffix = '. Expand it; do not contradict it.',
  MissingPrefix = 'No roadmap slot for episode ',
  MissingSuffix = '.',
  SequencePlaceholder = '{sequence}',
}

export enum RoadmapSlotLineLabel {
  Inciting = 'inciting',
  Midpoint = 'midpoint',
  Finale = 'finale',
  Hook = 'hook',
  ThematicQuestion = 'thematicQuestion',
}

export enum RoadmapSlotField {
  Id = 'id',
  Name = 'name',
  Title = 'title',
  Description = 'description',
  Logline = 'logline',
  IncitingIncident = 'incitingIncident',
  Midpoint = 'midpoint',
  Finale = 'finale',
  Hook = 'hook',
  Cliffhanger = 'cliffhanger',
  ThematicQuestion = 'thematicQuestion',
  ThematicFocus = 'thematicFocus',
  ProtagonistHook = 'protagonistHook',
  AntagonistMove = 'antagonistMove',
  FatalFlaw = 'fatalFlaw',
  MainPlotBeat = 'mainPlotBeat',
  BPlotBeat = 'bPlotBeat',
  Reasoning = 'reasoning',
  ActStructure = 'actStructure',
  KeyFactionsInvolved = 'keyFactionsInvolved',
  Consequences = 'consequences',
  WorldConsequence = 'worldConsequence',
}

function optionalString(value: string | null | undefined): string | undefined {
  const trimmed = value?.trim()
  return trimmed && trimmed.length > 0 ? trimmed : undefined
}

function stringList(value: unknown): string[] | undefined {
  if (!Array.isArray(value)) return undefined
  const items = value.filter((item): item is string => typeof item === 'string' && item.trim().length > 0)
  return items.length > 0 ? items : undefined
}

function nonEmptyRecords(value: unknown): Record<string, unknown>[] | undefined {
  const rows = recordArrayFromJson(value)
  return rows.length > 0 ? rows : undefined
}

function fieldString(value: unknown): string | null {
  return optionalString(readString(value)) ?? null
}

function fieldStringList(value: unknown): string[] | null {
  return stringList(value) ?? null
}

function slotId(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null
}

export function roadmapSlotFromUnknown(value: unknown): RoadmapSlot {
  const row = recordFromJson(value)
  const title = fieldString(row[RoadmapSlotField.Title])
  const name = fieldString(row[RoadmapSlotField.Name])
  return {
    id: slotId(row[RoadmapSlotField.Id]),
    name: name ?? title,
    title: title ?? name,
    description: fieldString(row[RoadmapSlotField.Description]),
    logline: fieldString(row[RoadmapSlotField.Logline]),
    incitingIncident: fieldString(row[RoadmapSlotField.IncitingIncident]),
    midpoint: fieldString(row[RoadmapSlotField.Midpoint]),
    finale: fieldString(row[RoadmapSlotField.Finale]),
    hook: fieldString(row[RoadmapSlotField.Hook]),
    cliffhanger: fieldString(row[RoadmapSlotField.Cliffhanger]),
    thematicQuestion: fieldString(row[RoadmapSlotField.ThematicQuestion]),
    thematicFocus: fieldString(row[RoadmapSlotField.ThematicFocus]),
    protagonistHook: fieldString(row[RoadmapSlotField.ProtagonistHook]),
    antagonistMove: fieldString(row[RoadmapSlotField.AntagonistMove]),
    fatalFlaw: fieldString(row[RoadmapSlotField.FatalFlaw]),
    mainPlotBeat: fieldString(row[RoadmapSlotField.MainPlotBeat]),
    bPlotBeat: fieldString(row[RoadmapSlotField.BPlotBeat]),
    reasoning: fieldString(row[RoadmapSlotField.Reasoning]),
    actStructure: fieldString(row[RoadmapSlotField.ActStructure]),
    keyFactionsInvolved: fieldStringList(row[RoadmapSlotField.KeyFactionsInvolved]),
    consequences: fieldStringList(row[RoadmapSlotField.Consequences]),
    worldConsequence: fieldString(row[RoadmapSlotField.WorldConsequence]),
  }
}

function slotsFromUnknown(value: unknown): RoadmapSlot[] {
  return recordArrayFromJson(value).map(roadmapSlotFromUnknown)
}

/**
 * Season-roadmap list. Overlay sequences win when non-empty; otherwise nested
 * episodeRoadmap.episodes → episodeRoadmap.sequences → top-level sequences.
 */
export function resolveRoadmapList(storyPlan: unknown, overlaySequences?: unknown): RoadmapSlot[] {
  const overlay = nonEmptyRecords(overlaySequences)
  if (overlay) return overlay.map(roadmapSlotFromUnknown)

  const plan = recordFromJson(storyPlan)
  const roadmap = recordFromJson(plan.episodeRoadmap)
  const fromEpisodes = nonEmptyRecords(roadmap.episodes)
  if (fromEpisodes) return fromEpisodes.map(roadmapSlotFromUnknown)
  const fromRoadmapSequences = nonEmptyRecords(roadmap.sequences)
  if (fromRoadmapSequences) return fromRoadmapSequences.map(roadmapSlotFromUnknown)
  return slotsFromUnknown(plan.sequences)
}

export function resolveRoadmapSlot(
  storyPlan: unknown,
  episodeSequence: number,
  overlaySequences?: unknown
): RoadmapSlot | undefined {
  if (!Number.isInteger(episodeSequence) || episodeSequence < 1) return undefined
  return resolveRoadmapList(storyPlan, overlaySequences)[episodeSequence - 1]
}

function slotTitle(slot: RoadmapSlot): string {
  return optionalString(slot.title) ?? optionalString(slot.name) ?? ''
}

function slotSummary(slot: RoadmapSlot): string {
  return optionalString(slot.logline) ?? optionalString(slot.description) ?? ''
}

function appendLabeledLine(lines: string[], label: RoadmapSlotLineLabel, value: string | null | undefined): void {
  const text = optionalString(value)
  if (!text) return
  lines.push(`${label}: ${text}`)
}

export function formatRoadmapSlot(slot: RoadmapSlot): string {
  const lines: string[] = []
  const title = slotTitle(slot)
  const summary = slotSummary(slot)
  if (title && summary) lines.push(`${title}: ${summary}`)
  else if (title) lines.push(title)
  else if (summary) lines.push(summary)
  appendLabeledLine(lines, RoadmapSlotLineLabel.Inciting, slot.incitingIncident)
  appendLabeledLine(lines, RoadmapSlotLineLabel.Midpoint, slot.midpoint)
  appendLabeledLine(lines, RoadmapSlotLineLabel.Finale, slot.finale)
  appendLabeledLine(lines, RoadmapSlotLineLabel.Hook, slot.hook)
  appendLabeledLine(lines, RoadmapSlotLineLabel.ThematicQuestion, slot.thematicQuestion)
  return lines.join('\n')
}

export function formatRoadmapList(slots: RoadmapSlot[]): string {
  return slots
    .map((slot, index) => {
      const title = slotTitle(slot)
      const summary = slotSummary(slot)
      const head = title && summary ? `${title}: ${summary}` : title || summary
      return head ? `${index + 1}. ${head}` : `${index + 1}.`
    })
    .join('\n')
}

export function formatRoadmapSlotBrief(slot: RoadmapSlot | undefined, episodeSequence: number): string {
  if (!slot) {
    return `${RoadmapSlotCopy.MissingPrefix}${episodeSequence}${RoadmapSlotCopy.MissingSuffix}`
  }
  return [
    `${RoadmapSlotCopy.ExpandPrefix}${episodeSequence}${RoadmapSlotCopy.ExpandSuffix}`,
    formatRoadmapSlot(slot),
  ].join('\n')
}
