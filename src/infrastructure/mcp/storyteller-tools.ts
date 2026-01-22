import { z } from 'zod'
import { db } from '@/db'
import { projects, characters, episodes, beats } from '@/domains/storyteller/db/schema'
import { eq } from 'drizzle-orm'

/**
 * Storyteller MCP Tools
 */
export const storytellerTools = {
  /**
   * Get the Series Bible for a project
   */
  get_bible: {
    description:
      'Retrieve the series bible (immutable truths, lore, world rules) for a specific story project.',
    schema: z.object({
      projectId: z.string().uuid().describe('The UUID of the project'),
    }),
    handler: async ({ projectId }: { projectId: string }) => {
      const project = await db.query.projects.findFirst({
        where: eq(projects.id, projectId),
        columns: {
          seriesBible: true,
          name: true,
        },
      })
      if (!project) throw new Error('Project not found')
      return project.seriesBible
    },
  },

  /**
   * Get all characters for a project
   */
  get_characters: {
    description:
      'Retrieve all characters, including their psychological metrics, roles, and descriptions for a project.',
    schema: z.object({
      projectId: z.string().uuid().describe('The UUID of the project'),
    }),
    handler: async ({ projectId }: { projectId: string }) => {
      const results = await db.query.characters.findMany({
        where: eq(characters.projectId, projectId),
      })
      return results
    },
  },

  /**
   * Get all episodes/chapters for a project
   */
  get_episodes: {
    description:
      'Retrieve the list of episodes or chapters for a project, including summaries and sequencing.',
    schema: z.object({
      projectId: z.string().uuid().describe('The UUID of the project'),
    }),
    handler: async ({ projectId }: { projectId: string }) => {
      const results = await db.query.episodes.findMany({
        where: eq(episodes.projectId, projectId),
        orderBy: [episodes.sequence],
      })
      return results
    },
  },

  /**
   * Get beats for a specific episode
   */
  get_beats: {
    description: 'Retrieve individual narrative beats (index cards) for an episode.',
    schema: z.object({
      episodeId: z.string().uuid().describe('The UUID of the episode'),
    }),
    handler: async ({ episodeId }: { episodeId: string }) => {
      const results = await db.query.beats.findMany({
        where: eq(beats.episodeId, episodeId),
        orderBy: [beats.sequence],
      })
      return results
    },
  },

  /**
   * Update the Series Bible
   */
  update_bible: {
    description: 'Update the series bible content (immutable truths, world rules) for a project.',
    schema: z.object({
      projectId: z.string().uuid().describe('The UUID of the project'),
      content: z.record(z.any()).describe('The new JSON content for the series bible'),
    }),
    handler: async ({
      projectId,
      content,
    }: {
      projectId: string
      content: Record<string, any>
    }) => {
      const result = await db
        .update(projects)
        .set({ seriesBible: content, updatedAt: new Date() })
        .where(eq(projects.id, projectId))
        .returning()
      return result[0]
    },
  },

  /**
   * Update a specific beat
   */
  update_beat: {
    description: 'Update a narrative beat (logline, content, status).',
    schema: z.object({
      beatId: z.string().uuid().describe('The UUID of the beat'),
      updates: z
        .object({
          logline: z.string().optional(),
          content: z.string().optional(),
          status: z.enum(['proposed', 'challenged', 'approved', 'locked']).optional(),
          sequence: z.number().optional(),
        })
        .describe('The fields to update'),
    }),
    handler: async ({ beatId, updates }: { beatId: string; updates: any }) => {
      const result = await db
        .update(beats)
        .set({ ...updates, updatedAt: new Date() })
        .where(eq(beats.id, beatId))
        .returning()
      return result[0]
    },
  },

  /**
   * Create a new character
   */
  create_character: {
    description: 'Create a new character in a project.',
    schema: z.object({
      projectId: z.string().uuid().describe('The UUID of the project'),
      name: z.string().describe('Full name of the character'),
      role: z.string().describe('Role (e.g., Protagonist, Supporting)'),
      description: z.string().optional().describe('Short backstory or physical traits'),
    }),
    handler: async ({
      projectId,
      name,
      role,
      description,
    }: {
      projectId: string
      name: string
      role: string
      description?: string
    }) => {
      const result = await db
        .insert(characters)
        .values({
          projectId,
          name,
          role,
          description,
          psychology: {},
          arcStatus: {},
        })
        .returning()
      return result[0]
    },
  },
}
