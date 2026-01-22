import { z } from 'zod'
import { db } from '@/db'
import { gameEntities, entityRelationships } from '@/db/schema'
import { eq, and, or, ilike } from 'drizzle-orm'

/**
 * Entity Bridge MCP Tools (Cross-Domain Orchestration)
 */
export const entityBridgeTools = {
  /**
   * Search for game entities across all domains
   */
  search_entities: {
    description:
      'Search for game entities (characters, locations, mechanics, items) across all project domains.',
    schema: z.object({
      projectId: z.string().uuid().describe('The UUID of the project'),
      query: z.string().describe('Search query (name or description)'),
      type: z.enum(['character', 'location', 'mechanic', 'faction', 'item', 'quest']).optional(),
    }),
    handler: async ({
      projectId,
      query,
      type,
    }: {
      projectId: string
      query: string
      type?: string
    }) => {
      const results = await db.query.gameEntities.findMany({
        where: (entities, { and, eq, or, ilike }) => {
          const conditions = [
            eq(entities.projectId, projectId),
            or(ilike(entities.name, `%${query}%`), ilike(entities.description, `%${query}%`)),
          ]
          if (type) conditions.push(eq(entities.entityType, type))
          return and(...conditions)
        },
        orderBy: (entities, { desc }) => [desc(entities.updatedAt)],
      })
      return results
    },
  },

  /**
   * Get entity relationships
   */
  get_entity_relationships: {
    description:
      'Retrieve relationships for a specific entity, showing how it connects to other locations, characters, or mechanics.',
    schema: z.object({
      entityId: z.string().uuid().describe('The UUID of the entity'),
    }),
    handler: async ({ entityId }: { entityId: string }) => {
      const results = await db.query.entityRelationships.findMany({
        where: (rel, { or, eq }) =>
          or(eq(rel.fromEntityId, entityId), eq(rel.toEntityId, entityId)),
        with: {
          fromEntity: true,
          toEntity: true,
        },
      })
      return results
    },
  },

  /**
   * Resolve cross-domain usage
   */
  get_entity_usage: {
    description:
      'Find which domains (storyteller, loop-creator, etc.) are currently using specific entities.',
    schema: z.object({
      entityId: z.string().uuid().describe('The UUID of the entity'),
    }),
    handler: async ({ entityId }: { entityId: string }) => {
      const result = await db.query.gameEntities.findFirst({
        where: eq(gameEntities.id, entityId),
        columns: {
          name: true,
          sourceDomain: true,
          usedInDomains: true,
        },
      })
      return result
    },
  },
}
