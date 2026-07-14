/**
 * Tiles Service
 *
 * Shared business logic for tile generation operations.
 * Wraps Trigger.dev tasks for both REST API and MCP server.
 */

import { tasks, runs } from '@trigger.dev/sdk/v3'
import { z } from 'zod'
import {
  AiUpscaleProvider,
  GenerationServiceErrorCode,
  GenerationServiceErrorMessage,
  GenerationServiceErrorName,
  GenerationServiceLog,
  GenerationServiceUserMessage,
  GenerationTriggerTaskId,
  TriggerRunResultStatus,
} from '@/shared/data/generation/constants/tiles-service'
import { recordFromJson } from '@/shared/data/json-guards'

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
  upscaleProvider: z.enum(['midjourney', 'stability', 'topaz']).optional().default(AiUpscaleProvider.Midjourney),
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
  status: `${TriggerRunResultStatus}`
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
  async generateTile(input: GenerateTileInput, _context: ServiceContext): Promise<TriggerRunResult> {
    const validated = generateTileSchema.parse(input)

    try {
      // Trigger the Trigger.dev task
      const handle = await tasks.trigger(`${GenerationTriggerTaskId.GenerateTile}`, {
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
        status: TriggerRunResultStatus.Triggered,
        message: `${GenerationServiceUserMessage.TileGenerationStartedPrefix}(${validated.x}, ${validated.y}). ${GenerationServiceUserMessage.RunStatusHint}`,
      }
    } catch (error) {
      console.error(GenerationServiceLog.TilesTriggerError, error)
      throw new ServiceError(
        GenerationServiceErrorMessage.FailedTriggerTileGeneration,
        GenerationServiceErrorCode.InternalError
      )
    }
  }

  /**
   * Upscale an existing tile
   * Returns immediately with a run ID - use getRunStatus to track progress
   */
  async upscaleTile(input: UpscaleTileInput, _context: ServiceContext): Promise<TriggerRunResult> {
    const validated = upscaleTileSchema.parse(input)

    try {
      const handle = await tasks.trigger(`${GenerationTriggerTaskId.UpscaleTile}`, {
        projectId: validated.projectId,
        tileId: validated.tileId,
        upscaleProvider: validated.upscaleProvider,
      })

      return {
        runId: handle.id,
        status: TriggerRunResultStatus.Triggered,
        message: GenerationServiceUserMessage.TileUpscaleStarted,
      }
    } catch (error) {
      console.error(GenerationServiceLog.TilesUpscaleError, error)
      throw new ServiceError(
        GenerationServiceErrorMessage.FailedTriggerTileUpscale,
        GenerationServiceErrorCode.InternalError
      )
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
        metadata: recordFromJson(run.metadata),
        createdAt: run.createdAt?.toISOString(),
        updatedAt: run.updatedAt?.toISOString(),
      }
    } catch (error) {
      console.error(GenerationServiceLog.TilesRunStatusError, error)
      throw new ServiceError(
        GenerationServiceErrorMessage.FailedRetrieveRunStatus,
        GenerationServiceErrorCode.NotFound
      )
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
      console.error(GenerationServiceLog.TilesCancelError, error)
      throw new ServiceError(
        GenerationServiceErrorMessage.FailedCancelRun,
        GenerationServiceErrorCode.InternalError
      )
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
    _context: ServiceContext
  ): Promise<TriggerRunResult> {
    const validated = generate3DModelSchema.parse(input)

    try {
      const handle = await tasks.trigger(`${GenerationTriggerTaskId.Generate3dModel}`, {
        projectId: validated.projectId,
        assetId: validated.assetId,
        prompt: validated.prompt,
      })

      return {
        runId: handle.id,
        status: TriggerRunResultStatus.Triggered,
        message: GenerationServiceUserMessage.ThreeDModelGenerationStarted,
      }
    } catch (error) {
      console.error(GenerationServiceLog.ThreeDTriggerError, error)
      throw new ServiceError(
        GenerationServiceErrorMessage.FailedTrigger3dModelGeneration,
        GenerationServiceErrorCode.InternalError
      )
    }
  }

  /**
   * Remesh a 3D model to reduce polygon count
   */
  async remesh3DModel(
    input: Remesh3DModelInput,
    _context: ServiceContext
  ): Promise<TriggerRunResult> {
    const validated = remesh3DModelSchema.parse(input)

    try {
      const handle = await tasks.trigger(`${GenerationTriggerTaskId.Remesh3dModel}`, {
        projectId: validated.projectId,
        assetId: validated.assetId,
        targetPolycount: validated.targetPolycount,
      })

      return {
        runId: handle.id,
        status: TriggerRunResultStatus.Triggered,
        message: GenerationServiceUserMessage.ThreeDModelRemeshStarted,
      }
    } catch (error) {
      console.error(GenerationServiceLog.ThreeDRemeshError, error)
      throw new ServiceError(
        GenerationServiceErrorMessage.FailedTrigger3dModelRemesh,
        GenerationServiceErrorCode.InternalError
      )
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
    _context: ServiceContext
  ): Promise<TriggerRunResult> {
    const validated = generatePortraitSchema.parse(input)

    try {
      const handle = await tasks.trigger(`${GenerationTriggerTaskId.GeneratePortrait}`, {
        projectId: validated.projectId,
        characterId: validated.characterId,
        prompt: validated.prompt,
        style: validated.style,
      })

      return {
        runId: handle.id,
        status: TriggerRunResultStatus.Triggered,
        message: GenerationServiceUserMessage.PortraitGenerationStarted,
      }
    } catch (error) {
      console.error(GenerationServiceLog.PortraitTriggerError, error)
      throw new ServiceError(
        GenerationServiceErrorMessage.FailedTriggerPortraitGeneration,
        GenerationServiceErrorCode.InternalError
      )
    }
  }
}

// ============================================
// ERROR HANDLING
// ============================================

export type ServiceErrorCode = `${GenerationServiceErrorCode}`

export class ServiceError extends Error {
  constructor(
    message: string,
    public code: ServiceErrorCode,
    public details?: any
  ) {
    super(message)
    this.name = GenerationServiceErrorName.ServiceError
  }
}

// ============================================
// SINGLETON EXPORTS
// ============================================

export const tilesService = new TilesService()
export const threeDService = new ThreeDService()
export const portraitService = new PortraitService()
