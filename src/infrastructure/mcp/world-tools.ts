import { z } from 'zod'
import { db } from '@/db'
import { interiorDesigns, tiles, assets } from '@/db/schema'
import { eq } from 'drizzle-orm'

/**
 * World & Interior MCP Tools
 */
export const worldTools = {
  /**
   * Get interior designs
   */
  get_interior_designs: {
    description: 'Retrieve all interior designs (layout, furniture, textures) for a project.',
    schema: z.object({
      projectId: z.string().uuid().describe('The UUID of the project'),
    }),
    handler: async ({ projectId }: { projectId: string }) => {
      const results = await db.query.interiorDesigns.findMany({
        where: eq(interiorDesigns.projectId, projectId),
      })
      return results
    },
  },

  /**
   * Get world tiles
   */
  get_tiles: {
    description: 'Retrieve the grid of world tiles for a project.',
    schema: z.object({
      projectId: z.string().uuid().describe('The UUID of the project'),
    }),
    handler: async ({ projectId }: { projectId: string }) => {
      const results = await db.query.tiles.findMany({
        where: eq(tiles.projectId, projectId),
      })
      return results
    },
  },

  /**
   * Get exported assets
   */
  get_assets: {
    description: 'Retrieve 3D assets (models, images) exported or uploaded for a project.',
    schema: z.object({
      projectId: z.string().uuid().describe('The UUID of the project'),
    }),
    handler: async ({ projectId }: { projectId: string }) => {
      const results = await db.query.assets.findMany({
        where: eq(assets.projectId, projectId),
      })
      return results
    },
  },

  /**
   * Get game entities (The Cross-Domain Swiss Army Knife)
   */
  get_entities: {
    description:
      'Retrieve shared game entities (characters, locations, mechanics) that bridge multiple domains.',
    schema: z.object({
      projectId: z.string().uuid().describe('The UUID of the project'),
      type: z.enum(['character', 'location', 'mechanic', 'faction', 'item', 'quest']).optional(),
    }),
    handler: async ({ projectId, type }: { projectId: string; type?: string }) => {
      const results = await db.query.gameEntities.findMany({
        where: (entities, { and, eq }) =>
          type
            ? and(eq(entities.projectId, projectId), eq(entities.entityType, type))
            : eq(entities.projectId, projectId),
      })
      return results
    },
  },
}
