/**
 * Tiles Service
 *
 * Shared business logic for tile generation operations.
 * Wraps Trigger.dev tasks for both REST API and MCP server.
 */

import { tasks, runs } from '@trigger.dev/sdk/v3'
import { z } from 'zod'

// ============================================
// SCHEMAS
// ============================================

export const aiProviderSchema = z.enum(['gemini', 'openai', 'stability', 'midjourney'])

export const generateTileSchema = z.object({
  projectId: z.string().uuid(),
  x: z.number().int(),
  y: z.number().int(),
  prompt: z.string().min(1),
  aiProvider: aiProviderSchema,
  aiConfig: z.record(z.any()).optional().default({}),
  isFirstTile: z.boolean().optional().default(true),
  styleReferenceUrls: z.array(z.string().url()).optional(),
})

export const upscaleTileSchema = z.object({
  projectId: z.string().uuid(),
  tileId: z.string().uuid(),
  upscaleProvider: z.enum(['midjourney', 'stability', 'topaz']).optional().default('midjourney'),
})

export const getRunStatusSchema = z.object({
  runId: z.string(),
})

// ============================================
// TYPES
// ============================================

export type GenerateTileInput = z.infer<typeof generateTileSchema>
export type UpscaleTileInput = z.infer<typeof upscaleTileSchema>
export type GetRunStatusInput = z.infer<typeof getRunStatusSchema>

export interface TriggerRunResult {
  runId: string
  status: 'triggered' | 'queued'
  message: string
  publicAccessToken?: string
}

export interface RunStatus {
  runId: string
  status: string
  output?: any
  error?: string
  metadata?: Record<string, unknown>
  createdAt?: string
  updatedAt?: string
}

export interface ServiceContext {
  userId: string
}

// ============================================
// SERVICE CLASS
// ============================================

export class TilesService {
  /**
   * Generate a tile using AI
   * Returns immediately with a run ID - use getRunStatus to track progress
   */
  async generateTile(input: GenerateTileInput, context: ServiceContext): Promise<TriggerRunResult> {
    const validated = generateTileSchema.parse(input)

    try {
      // Trigger the Trigger.dev task
      const handle = await tasks.trigger('generate-tile', {
        projectId: validated.projectId,
        x: validated.x,
        y: validated.y,
        prompt: validated.prompt,
        aiProvider: validated.aiProvider,
        aiConfig: validated.aiConfig,
        isFirstTile: validated.isFirstTile,
        styleReferenceUrls: validated.styleReferenceUrls,
      })

      return {
        runId: handle.id,
        status: 'triggered',
        message: `Tile generation started at (${validated.x}, ${validated.y}). Use get_run_status to track progress.`,
      }
    } catch (error) {
      console.error('[TilesService] Error triggering tile generation:', error)
      throw new ServiceError('Failed to trigger tile generation', 'INTERNAL_ERROR')
    }
  }

  /**
   * Upscale an existing tile
   * Returns immediately with a run ID - use getRunStatus to track progress
   */
  async upscaleTile(input: UpscaleTileInput, context: ServiceContext): Promise<TriggerRunResult> {
    const validated = upscaleTileSchema.parse(input)

    try {
      const handle = await tasks.trigger('upscale-tile', {
        projectId: validated.projectId,
        tileId: validated.tileId,
        upscaleProvider: validated.upscaleProvider,
      })

      return {
        runId: handle.id,
        status: 'triggered',
        message: 'Tile upscale started. Use get_run_status to track progress.',
      }
    } catch (error) {
      console.error('[TilesService] Error triggering tile upscale:', error)
      throw new ServiceError('Failed to trigger tile upscale', 'INTERNAL_ERROR')
    }
  }

  /**
   * Get the status of a Trigger.dev run
   */
  async getRunStatus(input: GetRunStatusInput): Promise<RunStatus> {
    const validated = getRunStatusSchema.parse(input)

    try {
      const run = await runs.retrieve(validated.runId)

      return {
        runId: run.id,
        status: run.status,
        output: run.output,
        error: run.error?.message,
        metadata: run.metadata as Record<string, unknown> | undefined,
        createdAt: run.createdAt?.toISOString(),
        updatedAt: run.updatedAt?.toISOString(),
      }
    } catch (error) {
      console.error('[TilesService] Error retrieving run status:', error)
      throw new ServiceError('Failed to retrieve run status', 'NOT_FOUND')
    }
  }

  /**
   * Cancel a running Trigger.dev task
   */
  async cancelRun(runId: string): Promise<{ success: boolean }> {
    try {
      await runs.cancel(runId)
      return { success: true }
    } catch (error) {
      console.error('[TilesService] Error canceling run:', error)
      throw new ServiceError('Failed to cancel run', 'INTERNAL_ERROR')
    }
  }
}

// ============================================
// 3D MODEL SERVICE
// ============================================

export const generate3DModelSchema = z.object({
  projectId: z.string().uuid(),
  assetId: z.string().uuid(),
  prompt: z.string().min(1),
})

export const remesh3DModelSchema = z.object({
  projectId: z.string().uuid(),
  assetId: z.string().uuid(),
  targetPolycount: z.number().int().min(100).max(100000).optional(),
})

export type Generate3DModelInput = z.infer<typeof generate3DModelSchema>
export type Remesh3DModelInput = z.infer<typeof remesh3DModelSchema>

export class ThreeDService {
  /**
   * Generate a 3D model from text
   */
  async generate3DModel(
    input: Generate3DModelInput,
    context: ServiceContext
  ): Promise<TriggerRunResult> {
    const validated = generate3DModelSchema.parse(input)

    try {
      const handle = await tasks.trigger('generate-3d-model', {
        projectId: validated.projectId,
        assetId: validated.assetId,
        prompt: validated.prompt,
      })

      return {
        runId: handle.id,
        status: 'triggered',
        message: '3D model generation started. Use get_run_status to track progress.',
      }
    } catch (error) {
      console.error('[ThreeDService] Error triggering 3D model generation:', error)
      throw new ServiceError('Failed to trigger 3D model generation', 'INTERNAL_ERROR')
    }
  }

  /**
   * Remesh a 3D model to reduce polygon count
   */
  async remesh3DModel(
    input: Remesh3DModelInput,
    context: ServiceContext
  ): Promise<TriggerRunResult> {
    const validated = remesh3DModelSchema.parse(input)

    try {
      const handle = await tasks.trigger('remesh-3d-model', {
        projectId: validated.projectId,
        assetId: validated.assetId,
        targetPolycount: validated.targetPolycount,
      })

      return {
        runId: handle.id,
        status: 'triggered',
        message: '3D model remesh started. Use get_run_status to track progress.',
      }
    } catch (error) {
      console.error('[ThreeDService] Error triggering 3D model remesh:', error)
      throw new ServiceError('Failed to trigger 3D model remesh', 'INTERNAL_ERROR')
    }
  }
}

// ============================================
// PORTRAIT SERVICE
// ============================================

export const generatePortraitSchema = z.object({
  projectId: z.string().uuid(),
  characterId: z.string().uuid(),
  prompt: z.string().optional(),
  style: z.string().optional(),
})

export type GeneratePortraitInput = z.infer<typeof generatePortraitSchema>

export class PortraitService {
  /**
   * Generate a character portrait
   */
  async generatePortrait(
    input: GeneratePortraitInput,
    context: ServiceContext
  ): Promise<TriggerRunResult> {
    const validated = generatePortraitSchema.parse(input)

    try {
      const handle = await tasks.trigger('generate-portrait', {
        projectId: validated.projectId,
        characterId: validated.characterId,
        prompt: validated.prompt,
        style: validated.style,
      })

      return {
        runId: handle.id,
        status: 'triggered',
        message: 'Portrait generation started. Use get_run_status to track progress.',
      }
    } catch (error) {
      console.error('[PortraitService] Error triggering portrait generation:', error)
      throw new ServiceError('Failed to trigger portrait generation', 'INTERNAL_ERROR')
    }
  }
}

// ============================================
// ERROR HANDLING
// ============================================

export type ServiceErrorCode =
  | 'NOT_FOUND'
  | 'UNAUTHORIZED'
  | 'VALIDATION_ERROR'
  | 'INTERNAL_ERROR'
  | 'RATE_LIMITED'

export class ServiceError extends Error {
  constructor(
    message: string,
    public code: ServiceErrorCode,
    public details?: any
  ) {
    super(message)
    this.name = 'ServiceError'
  }
}

// ============================================
// SINGLETON EXPORTS
// ============================================

export const tilesService = new TilesService()
export const threeDService = new ThreeDService()
export const portraitService = new PortraitService()
