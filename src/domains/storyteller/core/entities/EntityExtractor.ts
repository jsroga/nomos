import { EntityReference } from '@/domains/storyteller/core/entities/EntityReferences'
import { createRefId } from '@/domains/storyteller/core/entities/ReferenceParser'
import { StoryEntityType } from '@/domains/storyteller/core/entities/constants/entity-types'
import {
  ENTITY_GOALS_SEPARATOR,
  EntityExtractorFallback,
} from '@/domains/storyteller/core/entities/constants/entity-extractor-defaults'

/**
 * Minimal structural view of a story plan for entity extraction.
 *
 * Deliberately structural (not the core `StoryPlan` interface) so BOTH plan
 * shapes in the codebase satisfy it without casts: the hand-written
 * `core/types/StoryPlanTypes` interface (optional fields) and the
 * zod-inferred `agent-schemas` plan (nullable fields).
 */
export interface EntityExtractablePlan {
  factions?:
    | Array<{
        name: string
        description?: string | null
        ideology?: string | null
        goals?: string[] | null
        resources?: string | null
        weaknesses?: string | null
      }>
    | null
  keyCharacters?:
    | Array<{
        name: string
        role?: string | null
        archetype?: string | null
        motivation?: string | null
      }>
    | null
}

/**
 * Extracts entities from a StoryPlan into a map of EntityReferences
 * used for local resolution in ReferenceText
 */
export function extractEntitiesFromPlan(
  plan: EntityExtractablePlan,
  projectId: string,
  now: () => Date = () => new Date()
): Map<string, EntityReference> {
  const map = new Map<string, EntityReference>()

  if (!plan) return map

  // Helper to add entity
  const addEntity = (
    type: EntityReference['type'],
    name: string,
    description: string,
    metadata: Record<string, unknown> = {}
  ) => {
    // We need to generate a deterministic ID if possible, but usually the ID comes from the source
    // OR we match by name if ID is missing.
    // However, ReferenceText looks up by ID (e.g. "faction-the-bottlers-guild").
    // We need to generate the SAME ID that the LLM likely generated.
    // The LLM convention is typically `type-slugified-name`.

    // Attempt to generate the slug ID
    const slug = name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
    const id = createRefId(type, slug)

    // Store in map
    map.set(id, {
      id,
      type,
      name,
      description: description || '',
      metadata,
      projectId,
      createdAt: now(),
      lastReferencedAt: now(),
    })
  }

  // 1. Factions
  if (plan.factions) {
    plan.factions.forEach(f => {
      // Use explicit description if available (new schema), otherwise synthesize
      const ideology = f.ideology || EntityExtractorFallback.UnknownIdeology
      const goals =
        f.goals && Array.isArray(f.goals)
          ? f.goals.join(ENTITY_GOALS_SEPARATOR)
          : EntityExtractorFallback.UnknownGoals
      const description = f.description || `${ideology}. Goal: ${goals}`

      addEntity(StoryEntityType.Faction, f.name, description, {
        ideology: f.ideology,
        goals: f.goals || [],
        resources: f.resources,
        // weaknesses might be optional in schema but accessed here. Schema says nullable optional.
        weaknesses: f.weaknesses,
      })
    })
  }

  // 2. Key Characters
  if (plan.keyCharacters) {
    plan.keyCharacters.forEach(c => {
      // Synthesize description from role, archetype which are required
      const role = c.role || EntityExtractorFallback.UnknownRole
      const archetype = c.archetype || EntityExtractorFallback.UnknownArchetype
      const motivation = c.motivation || EntityExtractorFallback.UnknownMotivation
      const description = `${role} (${archetype}). Driven by: ${motivation}`

      addEntity(StoryEntityType.Character, c.name, description, {
        role: c.role,
        archetype: c.archetype,
        motivation: c.motivation,
        // fatalFlaw isn't in KeyCharacterSchema, removing it
      })
    })
  }

  // 3. World Rules (id is tricky here as they don't have names, usually addressed by rule-number or rule text?)
  // LLM usually generates rules without IDs. References to rules are rare unless named.
  // Skipping rules for now unless they have specific names.

  return map
}
