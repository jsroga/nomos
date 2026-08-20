import { readString, recordFromJson, stringArrayFromJson } from '@/shared/data/json-guards'

export interface FactionCardData {
  name: string
  description: string
  ideology: string
  goals: string[]
  resources: string
  politicalForces: string
  weaknesses: string
  rivals: string[]
}

function nonBlank(value: string | undefined): string {
  return value?.trim() ?? ''
}

function stringListFromUnknown(value: unknown): string[] {
  if (typeof value === 'string') {
    const trimmed = value.trim()
    return trimmed.length > 0 ? [trimmed] : []
  }
  return stringArrayFromJson(value).map(item => item.trim()).filter(item => item.length > 0)
}

export function normalizeFactionGoals(faction: FactionCardData): string[] {
  return faction.goals
}

export function normalizeFactionRivals(faction: FactionCardData): string[] {
  return faction.rivals
}

export enum FactionTitleSeparator {
  EmDash = ' — ',
  EnDash = ' – ',
  Hyphen = ' - ',
}

export function factionTileCopy(faction: FactionCardData): { title: string; description: string } {
  const name = faction.name.trim()
  const description = faction.description.trim()
  for (const separator of Object.values(FactionTitleSeparator)) {
    const index = name.indexOf(separator)
    if (index > 0) {
      const rest = name.slice(index + separator.length).trim()
      return {
        title: name.slice(0, index).trim(),
        description: [rest, description].filter(Boolean).join(' '),
      }
    }
  }
  return { title: name, description }
}

export function resolveFactionResources(faction: FactionCardData): {
  resources: string
  politicalForces: string | undefined
} {
  return {
    resources: faction.resources || faction.politicalForces,
    politicalForces: faction.politicalForces || undefined,
  }
}

export function factionCardFromUnknown(value: unknown): FactionCardData | null {
  const record = recordFromJson(value)
  const name = nonBlank(readString(record.name))
  if (!name) return null
  return {
    name,
    description: nonBlank(readString(record.description)),
    ideology: nonBlank(readString(record.ideology)),
    goals: stringListFromUnknown(record.goals),
    resources: nonBlank(readString(record.resources)),
    politicalForces: nonBlank(readString(record.politicalForces)),
    weaknesses: nonBlank(readString(record.weaknesses)),
    rivals: stringListFromUnknown(record.rivals),
  }
}
