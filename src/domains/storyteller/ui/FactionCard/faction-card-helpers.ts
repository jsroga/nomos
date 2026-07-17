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
