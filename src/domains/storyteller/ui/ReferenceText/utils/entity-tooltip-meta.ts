import { z } from 'zod'
import {
  ReferenceTextMetaLabel,
  ReferenceTextTooltipCopy,
  StoryEntityType,
  StorytellerTextSeparator,
} from '../constants/reference-text-display'
import { EntityReference } from '@/domains/storyteller/core/entities/entity-references'

const optionalString = z.string().optional().catch(undefined)
const optionalStringArray = z.array(z.string()).optional().catch(undefined)

const tooltipMetaSchema = z.object({
  role: optionalString,
  shortDescription: optionalString,
  archetype: optionalString,
  motivation: optionalString,
  fatalFlaw: optionalString,
  traits: optionalStringArray,
  description: optionalString,
  ideology: optionalString,
  powerStructure: optionalString,
  politicalForces: optionalString,
  goals: optionalStringArray,
  resources: optionalString,
  weaknesses: optionalString,
  atmosphere: optionalString,
  significance: optionalString,
  impact: optionalString,
  date: optionalString,
  rule: optionalString,
  consequence: optionalString,
  logline: optionalString,
  action: optionalString,
})

export type TooltipMeta = z.infer<typeof tooltipMetaSchema>

export function tooltipMetaFrom(metadata: unknown): TooltipMeta {
  const parsed = tooltipMetaSchema.safeParse(metadata ?? {})
  return parsed.success ? parsed.data : {}
}

function appendCharacterParts(meta: TooltipMeta, parts: string[]): void {
  if (meta.role) parts.push(meta.role)
  if (meta.shortDescription) parts.push(meta.shortDescription)
  if (meta.archetype) parts.push(`${ReferenceTextTooltipCopy.ArchetypePrefix} ${meta.archetype}`)
  if (meta.motivation) parts.push(`${ReferenceTextTooltipCopy.MotivationPrefix} ${meta.motivation}`)
  if (meta.fatalFlaw) parts.push(`${ReferenceTextTooltipCopy.FatalFlawPrefix} ${meta.fatalFlaw}`)
  if (meta.traits && Array.isArray(meta.traits)) {
    parts.push(
      `${ReferenceTextTooltipCopy.TraitsPrefix} ${meta.traits.slice(0, 3).join(StorytellerTextSeparator.CommaSpace)}`
    )
  }
}

function appendFactionParts(meta: TooltipMeta, parts: string[]): void {
  if (meta.description) parts.push(meta.description)
  if (meta.ideology && !meta.description) parts.push(meta.ideology)
  if (meta.powerStructure) parts.push(meta.powerStructure)
  if (meta.politicalForces) parts.push(meta.politicalForces)
  if (meta.goals && Array.isArray(meta.goals)) {
    parts.push(
      `${ReferenceTextTooltipCopy.GoalsPrefix} ${meta.goals.slice(0, 2).join(StorytellerTextSeparator.CommaSpace)}`
    )
  }
  if (meta.resources) parts.push(`${ReferenceTextTooltipCopy.ResourcesPrefix} ${meta.resources}`)
}

function appendPlaceParts(meta: TooltipMeta, parts: string[]): void {
  if (meta.description) parts.push(meta.description)
  if (meta.atmosphere) parts.push(meta.atmosphere)
  if (meta.significance) parts.push(meta.significance)
}

function appendEventParts(meta: TooltipMeta, parts: string[]): void {
  if (meta.description) parts.push(meta.description)
  if (meta.impact) parts.push(`${ReferenceTextTooltipCopy.ImpactPrefix} ${meta.impact}`)
  if (meta.date) parts.push(`${ReferenceTextTooltipCopy.DatePrefix} ${meta.date}`)
}

function appendRuleParts(meta: TooltipMeta, parts: string[]): void {
  if (meta.rule) parts.push(meta.rule)
  if (meta.consequence) parts.push(`${ReferenceTextTooltipCopy.ConsequencePrefix} ${meta.consequence}`)
}

function appendBeatParts(meta: TooltipMeta, parts: string[]): void {
  if (meta.logline) parts.push(meta.logline)
  if (meta.action) parts.push(meta.action)
}

export function synthesizeEntityDescription(entity: EntityReference): string | null {
  if (entity.description && entity.description.trim()) {
    return entity.description
  }

  const meta = tooltipMetaFrom(entity.metadata)
  const parts: string[] = []

  if (entity.type === StoryEntityType.Character) appendCharacterParts(meta, parts)
  if (entity.type === StoryEntityType.Faction) appendFactionParts(meta, parts)
  if (entity.type === StoryEntityType.Place) appendPlaceParts(meta, parts)
  if (entity.type === StoryEntityType.Event) appendEventParts(meta, parts)
  if (entity.type === StoryEntityType.Rule) appendRuleParts(meta, parts)
  if (entity.type === StoryEntityType.Beat) appendBeatParts(meta, parts)

  return parts.length > 0
    ? parts.slice(0, 3).join(StorytellerTextSeparator.PeriodSpace) + '.'
    : null
}

export interface TooltipMetaItem {
  label: string
  value: string
}

function includesValue(description: string | null, value: string | undefined): boolean {
  return Boolean(value && description?.includes(value))
}

function appendCharacterMeta(meta: TooltipMeta, description: string | null, items: TooltipMetaItem[]): void {
  if (meta.role && !includesValue(description, meta.role)) {
    items.push({ label: ReferenceTextMetaLabel.Role, value: meta.role })
  }
  if (meta.motivation && !includesValue(description, meta.motivation)) {
    items.push({ label: ReferenceTextMetaLabel.Motivation, value: meta.motivation })
  }
  if (meta.fatalFlaw && !includesValue(description, meta.fatalFlaw)) {
    items.push({ label: ReferenceTextMetaLabel.FatalFlaw, value: meta.fatalFlaw })
  }
}

function appendFactionMeta(meta: TooltipMeta, description: string | null, items: TooltipMetaItem[]): void {
  if (meta.powerStructure && !includesValue(description, meta.powerStructure)) {
    items.push({ label: ReferenceTextMetaLabel.Power, value: meta.powerStructure.slice(0, 150) })
  }
  if (meta.politicalForces && !includesValue(description, meta.politicalForces)) {
    items.push({ label: ReferenceTextMetaLabel.Politics, value: meta.politicalForces.slice(0, 150) })
  }
  if (meta.resources && !includesValue(description, meta.resources)) {
    items.push({ label: ReferenceTextMetaLabel.Resources, value: meta.resources })
  }
  if (meta.goals && Array.isArray(meta.goals) && meta.goals.length > 0) {
    items.push({
      label: ReferenceTextMetaLabel.Goals,
      value: meta.goals.slice(0, 2).join(StorytellerTextSeparator.CommaSpace),
    })
  }
  if (meta.weaknesses) {
    items.push({ label: ReferenceTextMetaLabel.Weakness, value: meta.weaknesses })
  }
}

export function buildDisplayMeta(entity: EntityReference, description: string | null): TooltipMetaItem[] {
  const meta = tooltipMetaFrom(entity.metadata)
  const items: TooltipMetaItem[] = []

  if (entity.type === StoryEntityType.Character) appendCharacterMeta(meta, description, items)
  if (entity.type === StoryEntityType.Faction) appendFactionMeta(meta, description, items)

  return items
}
