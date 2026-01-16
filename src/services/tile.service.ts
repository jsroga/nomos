/**
 * Tile Service - Core business logic for tile/world generation
 *
 * This service is stateless and can be used by both REST API and MCP.
 * It handles tile CRUD operations and tile generation via Trigger.dev.
 */

import { db } from '@/db'
import { tiles, projects } from '@/db/schema'
import { eq, and, sql } from 'drizzle-orm'
import { tasks, runs } from '@trigger.dev/sdk/v3'
import type { generateTileTask } from '@/trigger/generate-tile'
import { z } from 'zod'
import {
  NotFoundError,
  ForbiddenError,
  ValidationError,
  AsyncOperationStarted,
  AsyncOperationStatus,
} from './types'

type DbClient = typeof db

// =============================================================================
// Input Schemas
// =============================================================================

export const ListTilesInput = z.object({
  projectId: z.string().uuid(),
  minX: z.number().int().optional(),
  maxX: z.number().int().optional(),
  minY: z.number().int().optional(),
  maxY: z.number().int().optional(),
})
export type ListTilesInput = z.infer<typeof ListTilesInput>

export const GetTileInput = z.object({
  projectId: z.string().uuid(),
  x: z.number().int(),
  y: z.number().int(),
})
export type GetTileInput = z.infer<typeof GetTileInput>

export const SaveTileInput = z.object({
  projectId: z.string().uuid(),
  x: z.number().int(),
  y: z.number().int(),
  tilePrompt: z.string().optional(),
  imageFilename: z.string(),
})
export type SaveTileInput = z.infer<typeof SaveTileInput>

export const DeleteTileInput = z.object({
  projectId: z.string().uuid(),
  x: z.number().int(),
  y: z.number().int(),
})
export type DeleteTileInput = z.infer<typeof DeleteTileInput>

export const GenerateTileInput = z.object({
  projectId: z.string().uuid(),
  x: z.number().int(),
  y: z.number().int(),
  prompt: z.string().min(1),
  aiProvider: z.string(),
  aiConfig: z.object({
    apiKey: z.string().optional(),
    model: z.string().optional(),
  }),
  isFirstTile: z.boolean().optional().default(true),
  styleReferenceUrls: z.array(z.string()).optional(),
  contextImageBase64: z.string().optional(),
})
export type GenerateTileInput = z.infer<typeof GenerateTileInput>

export const GetRunStatusInput = z.object({
  runId: z.string(),
})
export type GetRunStatusInput = z.infer<typeof GetRunStatusInput>

// =============================================================================
// Output Types
// =============================================================================

export interface Tile {
  id: string
  projectId: string
  x: number
  y: number
  tilePrompt: string | null
  imageFilename: string | null
  createdAt: Date
}

export interface TileRunStatus {
  id: string
  status: string
  output?: unknown
  error?: unknown
  metadata?: Record<string, unknown>
  createdAt: Date
  updatedAt: Date
  startedAt?: Date
  finishedAt?: Date
}

// =============================================================================
// Transform Functions
// =============================================================================

function toTile(row: typeof tiles.$inferSelect): Tile {
  return {
    id: row.id,
    projectId: row.projectId,
    x: row.x,
    y: row.y,
    tilePrompt: row.tilePrompt,
    imageFilename: row.imageFilename,
    createdAt: row.createdAt,
  }
}

// =============================================================================
// Service Class
// =============================================================================

export class TileService {
  constructor(private dbClient: DbClient = db) {}

  /**
   * Verify user has access to a project
   */
  async verifyProjectAccess(projectId: string, userId: string): Promise<boolean> {
    const result = await this.dbClient
      .select({ id: projects.id })
      .from(projects)
      .where(and(eq(projects.id, projectId), eq(projects.userId, userId)))
      .limit(1)

    return result.length > 0
  }

  /**
   * List tiles for a project with optional bounding box filter
   */
  async listTiles(input: ListTilesInput, userId: string): Promise<Tile[]> {
    // Verify project access
    const hasAccess = await this.verifyProjectAccess(input.projectId, userId)
    if (!hasAccess) {
      throw new ForbiddenError('Project not found or access denied')
    }

    const conditions = [eq(tiles.projectId, input.projectId)]

    if (input.minX !== undefined) {
      conditions.push(sql`${tiles.x} >= ${input.minX}`)
    }
    if (input.maxX !== undefined) {
      conditions.push(sql`${tiles.x} <= ${input.maxX}`)
    }
    if (input.minY !== undefined) {
      conditions.push(sql`${tiles.y} >= ${input.minY}`)
    }
    if (input.maxY !== undefined) {
      conditions.push(sql`${tiles.y} <= ${input.maxY}`)
    }

    const rows = await this.dbClient
      .select()
      .from(tiles)
      .where(and(...conditions))

    return rows.map(toTile)
  }

  /**
   * Get a single tile by coordinates
   */
  async getTile(input: GetTileInput, userId: string): Promise<Tile | null> {
    // Verify project access
    const hasAccess = await this.verifyProjectAccess(input.projectId, userId)
    if (!hasAccess) {
      throw new ForbiddenError('Project not found or access denied')
    }

    const rows = await this.dbClient
      .select()
      .from(tiles)
      .where(
        and(eq(tiles.projectId, input.projectId), eq(tiles.x, input.x), eq(tiles.y, input.y))
      )
      .limit(1)

    return rows.length > 0 ? toTile(rows[0]) : null
  }

  /**
   * Save (create or update) a tile
   */
  async saveTile(input: SaveTileInput, userId: string): Promise<Tile> {
    // Verify project access
    const hasAccess = await this.verifyProjectAccess(input.projectId, userId)
    if (!hasAccess) {
      throw new ForbiddenError('Project not found or access denied')
    }

    // Check if tile exists
    const existing = await this.getTile(
      { projectId: input.projectId, x: input.x, y: input.y },
      userId
    )

    if (existing) {
      // Update existing tile
      const [row] = await this.dbClient
        .update(tiles)
        .set({
          tilePrompt: input.tilePrompt,
          imageFilename: input.imageFilename,
        })
        .where(eq(tiles.id, existing.id))
        .returning()

      return toTile(row)
    } else {
      // Insert new tile
      const [row] = await this.dbClient
        .insert(tiles)
        .values({
          projectId: input.projectId,
          x: input.x,
          y: input.y,
          tilePrompt: input.tilePrompt,
          imageFilename: input.imageFilename,
        })
        .returning()

      return toTile(row)
    }
  }

  /**
   * Delete a tile
   */
  async deleteTile(input: DeleteTileInput, userId: string): Promise<void> {
    // Verify project access
    const hasAccess = await this.verifyProjectAccess(input.projectId, userId)
    if (!hasAccess) {
      throw new ForbiddenError('Project not found or access denied')
    }

    await this.dbClient
      .delete(tiles)
      .where(
        and(eq(tiles.projectId, input.projectId), eq(tiles.x, input.x), eq(tiles.y, input.y))
      )
  }

  /**
   * Trigger tile generation via Trigger.dev
   */
  async generateTile(input: GenerateTileInput, userId: string): Promise<AsyncOperationStarted> {
    // Verify project access
    const hasAccess = await this.verifyProjectAccess(input.projectId, userId)
    if (!hasAccess) {
      throw new ForbiddenError('Project not found or access denied')
    }

    // Validate AI config
    if (!input.aiConfig.apiKey && !process.env.OPENAI_API_KEY) {
      throw new ValidationError('AI API key not provided')
    }

    // Get style references if needed
    let styleReferenceUrls = input.styleReferenceUrls
    if (input.isFirstTile && !styleReferenceUrls) {
      const [project] = await this.dbClient
        .select()
        .from(projects)
        .where(eq(projects.id, input.projectId))
        .limit(1)

      if (project) {
        // Note: This references the world-building project schema field
        // Adjust if your schema differs
        styleReferenceUrls = []
      }
    }

    // Trigger the task
    const handle = await tasks.trigger<typeof generateTileTask>('generate-tile', {
      projectId: input.projectId,
      x: input.x,
      y: input.y,
      prompt: input.prompt,
      aiProvider: input.aiProvider,
      aiConfig: input.aiConfig,
      isFirstTile: input.isFirstTile ?? true,
      ...(styleReferenceUrls ? { styleReferenceUrls } : {}),
      ...(input.contextImageBase64 ? { contextImageBase64: input.contextImageBase64 } : {}),
    }, {
      ttl: '10m',
    })

    return {
      status: 'started',
      runId: handle.id,
      message: `Tile generation started for (${input.x}, ${input.y})`,
    }
  }

  /**
   * Get status of a tile generation run
   */
  async getRunStatus(input: GetRunStatusInput): Promise<TileRunStatus> {
    try {
      const run = await runs.retrieve(input.runId)

      if (!run) {
        throw new NotFoundError('Run', input.runId)
      }

      return {
        id: run.id,
        status: run.status,
        output: run.output,
        error: run.error,
        metadata: run.metadata as Record<string, unknown> | undefined,
        createdAt: run.createdAt,
        updatedAt: run.updatedAt,
        startedAt: run.startedAt ?? undefined,
        finishedAt: run.finishedAt ?? undefined,
      }
    } catch (error: any) {
      if (error instanceof NotFoundError) throw error

      if (error.message?.includes('not found') || error.status === 404) {
        throw new NotFoundError('Run', input.runId)
      }

      throw error
    }
  }

  /**
   * Get project style references (useful for MCP)
   */
  async getProjectStyleReferences(projectId: string, userId: string): Promise<string[]> {
    // Verify project access
    const hasAccess = await this.verifyProjectAccess(projectId, userId)
    if (!hasAccess) {
      throw new ForbiddenError('Project not found or access denied')
    }

    const [project] = await this.dbClient
      .select()
      .from(projects)
      .where(eq(projects.id, projectId))
      .limit(1)

    if (!project) {
      throw new NotFoundError('Project', projectId)
    }

    // Note: This assumes projectPrompt might contain style info
    // Adjust based on your actual schema
    return []
  }
}

// Export singleton instance for convenience
export const tileService = new TileService()

