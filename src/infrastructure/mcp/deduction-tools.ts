import { z } from 'zod'
import { db } from '@/db'
import { gameEntities } from '@/db/schema'
import { eq, and } from 'drizzle-orm'

/**
 * Deduction Puzzle MCP Tools
 */
export const deductionTools = {
  /**
   * Get investigation leads
   */
  get_leads: {
    description:
      'Retrieve all investigation leads (potential breakthroughs) for a deduction puzzle.',
    schema: z.object({
      projectId: z.string().uuid().describe('The UUID of the project'),
    }),
    handler: async ({ projectId }: { projectId: string }) => {
      const results = await db.query.gameEntities.findMany({
        where: (entities, { and, eq }) =>
          and(
            eq(entities.projectId, projectId),
            eq(entities.sourceDomain, 'deduction-puzzle-designer'),
            eq(entities.entityType, 'mechanic') // Assuming leads are mapped to mechanics
          ),
      })
      return results
    },
  },

  /**
   * Get evidence items
   */
  get_evidence: {
    description:
      'Retrieve all evidence items (physical or testimonial) collected in a deduction scenario.',
    schema: z.object({
      projectId: z.string().uuid().describe('The UUID of the project'),
    }),
    handler: async ({ projectId }: { projectId: string }) => {
      const results = await db.query.gameEntities.findMany({
        where: (entities, { and, eq }) =>
          and(
            eq(entities.projectId, projectId),
            eq(entities.sourceDomain, 'deduction-puzzle-designer'),
            eq(entities.entityType, 'item') // Assuming evidence is mapped to items
          ),
      })
      return results
    },
  },

  /**
   * Get the logic map data
   */
  get_logic_map: {
    description:
      'Retrieve the logical connections and state of the deduction puzzle (nodes and edges).',
    schema: z.object({
      entityId: z.string().uuid().describe('The UUID of the logic map entity'),
    }),
    handler: async ({ entityId }: { entityId: string }) => {
      const result = await db.query.gameEntities.findFirst({
        where: and(
          eq(gameEntities.id, entityId),
          eq(gameEntities.sourceDomain, 'deduction-puzzle-designer')
        ),
        columns: {
          metadata: true,
        },
      })
      // The logic map (React Flow data) is stored in metadata
      return (result?.metadata as any)?.logicMap || {}
    },
  },
}
