/**
 * Entity Auto-Register Service
 *
 * Finds entities from project data (cast, story plan, DB) and registers them
 * in the entity registry when referenced by ID but not yet registered.
 */

import { characters, projects } from '@/db'
import { db } from '@/db/client'
import { StoryEntityType } from '@/domains/storyteller/core/entities/constants/entity-types'
import type { EntityType } from '@/domains/storyteller/core/entities/constants/reference-parser'
import { storyPlanRecordFromJson } from '@/domains/storyteller/core/entities/story-plan-wire'
import {
  namedRecordsFromJson,
  readString,
  recordFromJson,
} from '@/shared/data/json-guards'
import { API_LOG_PREFIX } from '@/shared/data/constants/api-errors'
import {
  EntityAutoRegisterFallback,
  EntityAutoRegisterStatus,
  StringSeparator,
} from '@/shared/data/constants/protocol'
import { eq } from 'drizzle-orm'
import type { ProjectScope } from '@/shared/auth/project-scope'
import { entityRegistry } from './entity-registry-service'
import {
  displayNameFromRefId,
  getEntityTypeFromId,
} from './entity-registry-reference-id'
import { generateBaseEntityDescription } from './entity-base-description-service'

interface AutoRegisterNameParts {
  namePart: string
  normalizedName: string
}

interface AutoRegisterProjectRow {
  storyPlan: unknown
  seriesBible: unknown
  cast: unknown
  storyPlanTable: { content: unknown } | null
}

interface AutoRegisterContext extends AutoRegisterNameParts {
  refId: string
  scope: ProjectScope
  context?: string | null
  storyPlan: Record<string, unknown>
  seriesBible: Record<string, unknown>
}

function extractNameFromRefId(refId: string): AutoRegisterNameParts {
  const namePart = refId.split('-').slice(1).join('-')
  return { namePart, normalizedName: displayNameFromRefId(refId) }
}

function entityNameMatches(
  entityName: string,
  namePart: string,
  normalizedName: string
): boolean {
  return (
    entityName.toLowerCase().replace(/\s+/g, '-') === namePart ||
    entityName.toLowerCase() === normalizedName.toLowerCase()
  )
}

async function loadProjectForAutoRegister(
  projectId: string
): Promise<AutoRegisterProjectRow | null> {
  const project = await db.query.projects.findFirst({
    where: eq(projects.id, projectId),
    with: {
      storyPlanTable: true,
    },
  })

  if (!project) {
    console.log(`[AutoRegister] Project not found: ${projectId}`)
    return null
  }

  return {
    storyPlan: project.storyPlan,
    seriesBible: project.seriesBible,
    cast: recordFromJson(project).cast,
    storyPlanTable: project.storyPlanTable,
  }
}

function resolveStoryPlan(project: AutoRegisterProjectRow): Record<string, unknown> {
  let storyPlan = storyPlanRecordFromJson(project.storyPlanTable?.content)
  if (Object.keys(storyPlan).length === 0) {
    storyPlan = storyPlanRecordFromJson(project.storyPlan)
  }
  return storyPlan
}

function buildFactionDescription(
  faction: Record<string, unknown> & { name: string }
): string {
  const description = readString(faction.description)
  const ideology = readString(faction.ideology)
  const powerStructure = readString(faction.powerStructure)
  const politicalForces = readString(faction.politicalForces)
  const goals = Array.isArray(faction.goals)
    ? faction.goals.filter((g): g is string => typeof g === 'string')
    : []

  const descriptionParts: string[] = []
  if (description) descriptionParts.push(description)
  if (ideology && ideology !== description) descriptionParts.push(ideology)
  if (powerStructure) descriptionParts.push(powerStructure)
  if (politicalForces) descriptionParts.push(politicalForces)
  if (goals.length > 0) {
    descriptionParts.push(`Goals: ${goals.slice(0, 2).join(StringSeparator.SemicolonSpace)}`)
  }

  return descriptionParts.length > 0 ? descriptionParts.slice(0, 3).join(' ') : faction.name
}

async function generatedStubDescription(ctx: AutoRegisterContext, type: EntityType): Promise<string> {
  return generateBaseEntityDescription({
    name: ctx.normalizedName,
    type,
    surroundingText: ctx.context ?? '',
    scope: ctx.scope,
  })
}

async function registerGeneratedStub(ctx: AutoRegisterContext, type: EntityType): Promise<boolean> {
  const description = await generatedStubDescription(ctx, type)
  await entityRegistry.registerWithId(ctx.refId, {
    name: ctx.normalizedName,
    description,
    metadata: { status: EntityAutoRegisterStatus.Discovered, inferredFromText: true },
    scope: ctx.scope,
  })
  return true
}

async function registerStubFaction(ctx: AutoRegisterContext): Promise<boolean> {
  console.log(
    `⚠️ [AutoRegister] No faction matched in storyPlan for: ${ctx.normalizedName}. Creating stub.`
  )
  const registered = await registerGeneratedStub(ctx, StoryEntityType.Faction)
  console.log(
    `✅ [AutoRegister] Created stub faction with ID ${ctx.refId}: ${ctx.normalizedName}`
  )
  return registered
}

async function tryRegisterFaction(ctx: AutoRegisterContext): Promise<boolean> {
  const factions = namedRecordsFromJson(ctx.storyPlan.factions)
  console.log(`[AutoRegister] Found ${factions.length} factions in storyPlan`)
  console.log(
    API_LOG_PREFIX.AUTO_REGISTER_FACTION_NAMES,
    factions.map(f => f.name)
  )

  const faction = factions.find(f =>
    entityNameMatches(f.name, ctx.namePart, ctx.normalizedName)
  )

  if (!faction) {
    return registerStubFaction(ctx)
  }

  console.log(`[AutoRegister] Matched faction: ${faction.name}`)
  const factionDescription = buildFactionDescription(faction)

  await entityRegistry.registerWithId(ctx.refId, {
    name: faction.name,
    description: factionDescription,
    metadata: faction,
    scope: ctx.scope,
  })
  console.log(`✅ [AutoRegister] Registered faction with ID ${ctx.refId}: ${faction.name}`)
  console.log(`   Description: ${factionDescription.slice(0, 100)}`)
  return true
}

function buildCharacterDescription(
  character: Record<string, unknown> & { name: string }
): string {
  const shortDescription = readString(character.shortDescription)
  const fullDescription = readString(character.description)
  const role = readString(character.role)

  const descParts: string[] = []
  if (shortDescription) descParts.push(shortDescription)
  if (fullDescription && fullDescription !== shortDescription) {
    descParts.push(fullDescription)
  }
  if (role) descParts.push(`Role: ${role}`)

  return descParts.length > 0 ? descParts.join(StringSeparator.DotSpace) : character.name
}

async function tryRegisterCharacterFromCast(
  ctx: AutoRegisterContext,
  project: AutoRegisterProjectRow
): Promise<boolean> {
  console.log(`[AutoRegister] Looking for character: ${ctx.normalizedName}`)

  const cast = namedRecordsFromJson(project.cast)
  console.log(`[AutoRegister] Found ${cast.length} characters in project.cast`)
  console.log(
    API_LOG_PREFIX.AUTO_REGISTER_CHARACTER_NAMES,
    cast.map(c => c.name)
  )

  const character = cast.find(c =>
    entityNameMatches(c.name, ctx.namePart, ctx.normalizedName)
  )

  if (!character) {
    console.log(`❌ [AutoRegister] No character matched in cast for: ${ctx.normalizedName}`)
    return false
  }

  const description = buildCharacterDescription(character)

  await entityRegistry.registerWithId(ctx.refId, {
    name: character.name,
    description,
    metadata: character,
    scope: ctx.scope,
  })
  console.log(`✅ [AutoRegister] Registered character with ID ${ctx.refId}: ${character.name}`)
  console.log(`   Description: ${description.slice(0, 100)}`)
  return true
}

async function tryRegisterCharacterFromDb(ctx: AutoRegisterContext): Promise<boolean> {
  const dbCharacters = await db
    .select()
    .from(characters)
    .where(eq(characters.projectId, ctx.scope.projectId))

  const matchedChar = dbCharacters.find(
    c =>
      c.name !== null &&
      entityNameMatches(c.name, ctx.namePart, ctx.normalizedName)
  )

  if (!matchedChar) {
    return false
  }

  const psychology = recordFromJson(matchedChar.psychology)
  const description =
    matchedChar.description || matchedChar.role || matchedChar.name

  await entityRegistry.registerWithId(ctx.refId, {
    name: matchedChar.name,
    description,
    metadata: {
      role: matchedChar.role,
      archetype: readString(psychology.archetype),
      motivation: readString(psychology.motivation),
      fatalFlaw: readString(psychology.fatalFlaw),
      traits: psychology.traits,
    },
    scope: ctx.scope,
    sourceEntityId: matchedChar.id,
  })
  console.log(
    `✅ [AutoRegister] Registered character from DB with ID ${ctx.refId}: ${matchedChar.name}`
  )
  console.log(`   Description: ${description.slice(0, 100)}`)
  return true
}

async function tryRegisterCharacter(
  ctx: AutoRegisterContext,
  project: AutoRegisterProjectRow
): Promise<boolean> {
  if (await tryRegisterCharacterFromCast(ctx, project)) {
    return true
  }
  if (await tryRegisterCharacterFromDb(ctx)) {
    return true
  }
  return registerGeneratedStub(ctx, StoryEntityType.Character)
}

async function tryRegisterRule(ctx: AutoRegisterContext): Promise<boolean> {
  const rules = namedRecordsFromJson(ctx.storyPlan.worldRules)
  const firstNameWord = ctx.normalizedName.toLowerCase().split(' ')[0] ?? ''
  const rule = rules.find(
    (r, idx) =>
      `rule-${idx}` === ctx.refId ||
      readString(r.rule)?.toLowerCase().includes(firstNameWord)
  )

  if (!rule) {
    return registerGeneratedStub(ctx, StoryEntityType.Rule)
  }

  const ruleText = readString(rule.rule)
  await entityRegistry.registerWithId(ctx.refId, {
    name: ruleText?.slice(0, 50) || EntityAutoRegisterFallback.Rule,
    description: readString(rule.consequence) || ruleText || '',
    metadata: rule,
    scope: ctx.scope,
  })
  console.log(`✅ [AutoRegister] Registered rule with ID ${ctx.refId}`)
  return true
}

async function tryRegisterPlace(ctx: AutoRegisterContext): Promise<boolean> {
  console.log(`[AutoRegister] Registering place: ${ctx.normalizedName}`)

  const placeDescription = await generatedStubDescription(ctx, StoryEntityType.Place)

  await entityRegistry.registerWithId(ctx.refId, {
    name: ctx.normalizedName,
    description: placeDescription,
    metadata: { inferredFromText: true },
    scope: ctx.scope,
  })
  console.log(`✅ [AutoRegister] Registered place with ID ${ctx.refId}: ${ctx.normalizedName}`)
  console.log(
    `   Description: ${placeDescription.slice(0, 100) || EntityAutoRegisterFallback.None}`
  )
  return true
}

async function tryRegisterEvent(ctx: AutoRegisterContext): Promise<boolean> {
  const registered = await registerGeneratedStub(ctx, StoryEntityType.Event)
  console.log(`✅ [AutoRegister] Registered event with ID ${ctx.refId}: ${ctx.normalizedName}`)
  return registered
}

async function registerByEntityType(
  type: EntityType,
  ctx: AutoRegisterContext,
  project: AutoRegisterProjectRow
): Promise<boolean> {
  switch (type) {
    case StoryEntityType.Faction:
      return tryRegisterFaction(ctx)
    case StoryEntityType.Character:
      return tryRegisterCharacter(ctx, project)
    case StoryEntityType.Rule:
      return tryRegisterRule(ctx)
    case StoryEntityType.Place:
      return tryRegisterPlace(ctx)
    case StoryEntityType.Event:
      return tryRegisterEvent(ctx)
    default:
      return registerGeneratedStub(ctx, type)
  }
}

/** Find entity from project data and auto-register it in the entity registry. */
export async function tryAutoRegisterEntity(
  refId: string,
  scope: ProjectScope,
  context?: string | null
): Promise<boolean> {
  const type = getEntityTypeFromId(refId)
  if (!type) {
    console.log(`[AutoRegister] No type found for refId: ${refId}`)
    return false
  }

  try {
    const project = await loadProjectForAutoRegister(scope.projectId)
    if (!project) {
      return false
    }

    const storyPlan = resolveStoryPlan(project)
    const seriesBible = recordFromJson(project.seriesBible)
    const { namePart, normalizedName } = extractNameFromRefId(refId)

    console.log(`[AutoRegister] Trying to register ${type}: ${refId}`)
    console.log(`[AutoRegister] namePart: "${namePart}", normalizedName: "${normalizedName}"`)

    const ctx: AutoRegisterContext = {
      refId,
      scope,
      context,
      namePart,
      normalizedName,
      storyPlan,
      seriesBible,
    }

    return registerByEntityType(type, ctx, project)
  } catch (error) {
    console.warn(API_LOG_PREFIX.ENTITY_AUTO_REGISTER_FAILED, error)
    return false
  }
}
