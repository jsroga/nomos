import type { Faction } from '@/domains/storyteller/ai/prompts/schemas/agent-schemas'
import { readString, recordFromJson } from '@/shared/data/json-guards'

export function normalizeFactionGoals(faction: Faction): string[] {
  if (Array.isArray(faction.goals)) return faction.goals
  if (typeof faction.goals === 'string' && faction.goals) return [faction.goals]
  return []
}

export function normalizeFactionRivals(faction: Faction): string[] {
  if (Array.isArray(faction.rivals)) return faction.rivals
  if (typeof faction.rivals === 'string' && faction.rivals) return [faction.rivals]
  return []
}

export enum FactionTitleSeparator {
  EmDash = ' — ',
  EnDash = ' – ',
  Hyphen = ' - ',
}

export function factionTileCopy(faction: Faction): { title: string; description: string } {
  const name = faction.name?.trim() ?? ''
  const description = faction.description?.trim() ?? ''
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

export function resolveFactionResources(faction: Faction): {
  resources: string
  politicalForces: string | undefined
} {
  const factionRecord = recordFromJson(faction)
  const politicalForces = readString(factionRecord.politicalForces)
  return {
    resources: faction.resources || politicalForces || '',
    politicalForces,
  }
}
