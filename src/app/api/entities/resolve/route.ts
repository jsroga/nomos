/**
 * Entity Resolution API
 *
 * Resolves entity reference IDs to their full entity details.
 * Used by client-side components to fetch entity data without
 * importing server-only database code.
 *
 * If entities aren't found in the registry, attempts to create them
 * from existing project data (characters, factions, etc.)
 *
 * Query params:
 * - projectId: Required
 * - ids: Comma-separated entity IDs
 * - enrichRelationships: Add relationship data
 * - context: Surrounding text for AI-generated contextual summaries
 */

import { NextRequest, NextResponse } from 'next/server'
import { characters, projects } from '@/db'
import {
  contextualSummaryService,
  entityRegistry,
  getEntityTypeFromId,
  relationshipEnricher,
} from '@/domains/storyteller/server'
import { db } from '@/db/client'
import { eq } from 'drizzle-orm'
import {
  namedRecordsFromJson,
  readString,
  recordFromJson,
} from '@/shared/data/json-guards'
import { storyPlanRecordFromJson } from '@/domains/storyteller/core/entities/story-plan-wire'

/**
 * Try to find entity from project data and auto-register it
 */
async function tryAutoRegisterEntity(
  refId: string,
  projectId: string,
  context?: string | null
): Promise<boolean> {
  const type = getEntityTypeFromId(refId)
  if (!type) {
    console.log(`[AutoRegister] No type found for refId: ${refId}`)
    return false
  }

  try {
    // Fetch project data with story plan relation
    const project = await db.query.projects.findFirst({
      where: eq(projects.id, projectId),
      with: {
        storyPlanTable: true,
      },
    })

    if (!project) {
      console.log(`[AutoRegister] Project not found: ${projectId}`)
      return false
    }

    let storyPlan = storyPlanRecordFromJson(project.storyPlanTable?.content)
    if (Object.keys(storyPlan).length === 0) {
      storyPlan = storyPlanRecordFromJson(project.storyPlan)
    }
    const seriesBible = recordFromJson(project.seriesBible)

    // Try to match entity by name from refId
    // Extract potential name from refId (e.g., "faction-the-bottlers-guild" -> "The Bottlers Guild")
    const namePart = refId.split('-').slice(1).join('-')
    const normalizedName = namePart
      .replace(/-/g, ' ')
      .split(' ')
      .map(w => w.charAt(0).toUpperCase() + w.slice(1))
      .join(' ')

    console.log(`[AutoRegister] Trying to register ${type}: ${refId}`)
    console.log(`[AutoRegister] namePart: "${namePart}", normalizedName: "${normalizedName}"`)

    if (type === 'faction') {
      const factions = namedRecordsFromJson(storyPlan.factions)
      console.log(`[AutoRegister] Found ${factions.length} factions in storyPlan`)
      console.log(
        '[AutoRegister] Faction names:',
        factions.map(f => f.name)
      )

      const faction = factions.find(
        f =>
          f.name.toLowerCase().replace(/\s+/g, '-') === namePart ||
          f.name.toLowerCase() === normalizedName.toLowerCase()
      )

      if (faction) {
        console.log(`[AutoRegister] Matched faction: ${faction.name}`)

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
          descriptionParts.push(`Goals: ${goals.slice(0, 2).join('; ')}`)
        }

        const factionDescription =
          descriptionParts.length > 0 ? descriptionParts.slice(0, 3).join(' ') : faction.name

        await entityRegistry.registerWithId(refId, {
          name: faction.name,
          description: factionDescription,
          metadata: faction,
          projectId,
        })
        console.log(`✅ [AutoRegister] Registered faction with ID ${refId}: ${faction.name}`)
        console.log(`   Description: ${factionDescription.slice(0, 100)}`)
        return true
      } else {
        console.log(
          `⚠️ [AutoRegister] No faction matched in storyPlan for: ${normalizedName}. Creating stub.`
        )

        // Fallback: Register a stub/discovered faction
        // If context is available, use it as description, otherwise generic
        const stubDescription = context
          ? context.slice(0, 300) // Use context relative to this entity
          : '' // Removed "A faction identified as ${normalizedName}"

        await entityRegistry.registerWithId(refId, {
          name: normalizedName,
          description: stubDescription,
          metadata: { status: 'discovered', inferredFromText: true },
          projectId,
        })
        console.log(`✅ [AutoRegister] Created stub faction with ID ${refId}: ${normalizedName}`)
        return true
      }
    }

    if (type === 'character') {
      console.log(`[AutoRegister] Looking for character: ${normalizedName}`)

      // Check cast in project
      const cast = namedRecordsFromJson(recordFromJson(project).cast)
      console.log(`[AutoRegister] Found ${cast.length} characters in project.cast`)
      console.log(
        '[AutoRegister] Character names:',
        cast.map(c => c.name)
      )

      const character = cast.find(
        c =>
          c.name.toLowerCase().replace(/\s+/g, '-') === namePart ||
          c.name.toLowerCase() === normalizedName.toLowerCase()
      )

      if (character) {
        const shortDescription = readString(character.shortDescription)
        const fullDescription = readString(character.description)
        const role = readString(character.role)

        const descParts: string[] = []
        if (shortDescription) descParts.push(shortDescription)
        if (fullDescription && fullDescription !== shortDescription) {
          descParts.push(fullDescription)
        }
        if (role) descParts.push(`Role: ${role}`)

        const description = descParts.length > 0 ? descParts.join('. ') : character.name

        await entityRegistry.registerWithId(refId, {
          name: character.name,
          description,
          metadata: character,
          projectId,
        })
        console.log(`✅ [AutoRegister] Registered character with ID ${refId}: ${character.name}`)
        console.log(`   Description: ${description.slice(0, 100)}`)
        return true
      } else {
        console.log(`❌ [AutoRegister] No character matched in cast for: ${normalizedName}`)
      }

      // Check characters table
      const [dbChar] = await db
        .select()
        .from(characters)
        .where(eq(characters.projectId, projectId))
        .limit(100)

      // This returns all, we need to filter
      const dbCharacters = await db
        .select()
        .from(characters)
        .where(eq(characters.projectId, projectId))

      const matchedChar = dbCharacters.find(
        c =>
          c.name?.toLowerCase().replace(/\s+/g, '-') === namePart ||
          c.name?.toLowerCase() === normalizedName.toLowerCase()
      )

      if (matchedChar) {
        const psychology = recordFromJson(matchedChar.psychology)
        const description =
          matchedChar.description ||
          matchedChar.role ||
          matchedChar.name

        await entityRegistry.registerWithId(refId, {
          name: matchedChar.name,
          description,
          metadata: {
            role: matchedChar.role,
            archetype: readString(psychology.archetype),
            motivation: readString(psychology.motivation),
            fatalFlaw: readString(psychology.fatalFlaw),
            traits: psychology.traits,
          },
          projectId,
          sourceEntityId: matchedChar.id,
        })
        console.log(
          `✅ [AutoRegister] Registered character from DB with ID ${refId}: ${matchedChar.name}`
        )
        console.log(`   Description: ${description.slice(0, 100)}`)
        return true
      }
    }

    if (type === 'rule') {
      const rules = namedRecordsFromJson(storyPlan.worldRules)
      const rule = rules.find(
        (r, idx) =>
          `rule-${idx}` === refId ||
          readString(r.rule)?.toLowerCase().includes(normalizedName.toLowerCase().split(' ')[0] ?? '')
      )

      if (rule) {
        const ruleText = readString(rule.rule)
        await entityRegistry.registerWithId(refId, {
          name: ruleText?.slice(0, 50) || 'Rule',
          description: readString(rule.consequence) || ruleText || '',
          metadata: rule,
          projectId,
        })
        console.log(`✅ [AutoRegister] Registered rule with ID ${refId}`)
        return true
      }
    }

    if (type === 'place') {
      console.log(`[AutoRegister] Registering place: ${normalizedName}`)

      // Try to find place description from world description or other fields
      const worldDesc =
        readString(storyPlan.worldDescription) ?? readString(seriesBible.worldDescription) ?? ''

      // Extract a sentence containing the place name as description
      let placeDescription = ''
      if (worldDesc) {
        const sentences = worldDesc.split(/[.!?]+/).map((s: string) => s.trim())
        const mentioningSentence = sentences.find((s: string) =>
          s.toLowerCase().includes(normalizedName.toLowerCase())
        )
        if (mentioningSentence) {
          placeDescription = mentioningSentence.slice(0, 200)
        }
      }

      await entityRegistry.registerWithId(refId, {
        name: normalizedName,
        description: placeDescription || '', // Removed "A location in the story"
        metadata: { inferredFromText: true },
        projectId,
      })
      console.log(`✅ [AutoRegister] Registered place with ID ${refId}: ${normalizedName}`)
      console.log(`   Description: ${placeDescription.slice(0, 100) || '(none)'}`)
      return true
    }

    if (type === 'event') {
      await entityRegistry.registerWithId(refId, {
        name: normalizedName,
        description: context?.slice(0, 300) || '', // Removed "An event in the story"
        metadata: { inferredFromText: true },
        projectId,
      })
      console.log(`✅ [AutoRegister] Registered event with ID ${refId}: ${normalizedName}`)
      return true
    }

    return false
  } catch (error) {
    console.warn('[Entity Resolution] Auto-register failed:', error)
    return false
  }
}

export async function GET(request: NextRequest) {
  try {
    // Security: Require authentication
    const { requireAuth } = await import('@/shared/auth/auth')
    const { verifyProjectAccess } = await import('@/domains/storyteller/server')

    const { session } = await requireAuth()
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const projectId = searchParams.get('projectId')
    const idsParam = searchParams.get('ids')
    const enrichRelationships = searchParams.get('enrichRelationships') === 'true'
    const context = searchParams.get('context') // Surrounding text for contextual summaries

    if (!projectId) {
      return NextResponse.json({ error: 'Missing projectId parameter' }, { status: 400 })
    }

    // Security: Verify user has access to this project
    if (!(await verifyProjectAccess(projectId, session.user.id))) {
      return NextResponse.json({ error: 'Project not found or access denied' }, { status: 403 })
    }

    if (!idsParam) {
      return NextResponse.json({ error: 'Missing ids parameter' }, { status: 400 })
    }

    // Security: Limit number of IDs to prevent abuse
    const ids = idsParam
      .split(',')
      .filter(id => id.trim())
      .slice(0, 50) // Max 50 entities per request

    // Security: Validate ID format (allow alphanumeric, hyphens, underscores, dots, and apostrophes)
    const validIdPattern = /^[a-z0-9-_.'’]+$/i
    const invalidIds = ids.filter(id => !validIdPattern.test(id))
    if (invalidIds.length > 0) {
      return NextResponse.json({ error: 'Invalid entity ID format', invalidIds }, { status: 400 })
    }

    if (ids.length === 0) {
      return NextResponse.json({ entities: [] })
    }

    // First try to resolve from registry
    let resolved = await entityRegistry.resolveMany(ids)

    // Find unresolved IDs and try to auto-register them
    const unresolvedIds = ids.filter(id => !resolved.has(id))

    if (unresolvedIds.length > 0) {
      console.log(
        `[Entity Resolution] Attempting to auto-register ${unresolvedIds.length} unresolved entities`
      )
      // Try to auto-register from project data
      const autoRegisterPromises = unresolvedIds.map(id =>
        tryAutoRegisterEntity(id, projectId, context)
      )
      await Promise.all(autoRegisterPromises)

      // Re-resolve after auto-registration
      resolved = await entityRegistry.resolveMany(ids)
    }

    let entities = Array.from(resolved.values())

    // Optionally enrich with relationship data
    if (enrichRelationships) {
      const enrichedEntities = await Promise.all(
        entities.map(async entity => {
          const enriched = await relationshipEnricher.enrichEntity(
            entity.id,
            entity.type,
            entity.name,
            projectId,
            entity.description
          )

          return {
            ...entity,
            relationships: enriched.relationships,
            relationshipSummary: enriched.relationshipSummary,
          }
        })
      )
      entities = enrichedEntities
    }

    // Generate AI contextual summaries
    // Security: Limit context length to prevent abuse (max 1000 chars)
    const safeContext = context ? context.slice(0, 1000) : ''

    const hasValidContext = safeContext.length > 10
    const needsBaselineSummary = entities.some(e => !e.description || e.description.trim() === '')

    if (hasValidContext || needsBaselineSummary) {
      // Prioritize entities without descriptions, then fill remaining slots up to 10
      const entitiesWithoutDesc = entities.filter(e => !e.description || e.description.trim() === '')
      const entitiesWithDesc = entities.filter(e => e.description && e.description.trim() !== '')

      // Security: Limit to 10 entities for contextual summaries to prevent excessive LLM calls
      const entitiesToEnrich = [...entitiesWithoutDesc, ...entitiesWithDesc].slice(0, 10)
      const enrichedIds = new Set(entitiesToEnrich.map(e => e.id))
      const remainingEntities = entities.filter(e => !enrichedIds.has(e.id))

      const contextualEntities = await Promise.all(
        entitiesToEnrich.map(async entity => {
          try {
            const { contextualSummary, cacheHit } = await contextualSummaryService.generate({
              entityId: entity.id,
              entityName: entity.name,
              entityType: entity.type,
              entityDescription: entity.description || '',
              surroundingText: safeContext,
              projectId,
            })

            return {
              ...entity,
              contextualSummary,
              contextualSummaryCacheHit: cacheHit,
            }
          } catch (err) {
            console.warn(`[Entity Resolution] Contextual summary failed for ${entity.id}:`, err)
            return entity
          }
        })
      )
      entities = [...contextualEntities, ...remainingEntities]
    }

    return NextResponse.json({ entities })
  } catch (error) {
    console.error('[API] Entity resolution failed:', error)
    return NextResponse.json({ error: 'Failed to resolve entities' }, { status: 500 })
  }
}
