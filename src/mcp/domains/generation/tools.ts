/**
 * Generation MCP Tools
 *
 * Tools for generating tiles, 3D models, portraits via Trigger.dev tasks.
 */

import { createTool } from '@mastra/core/tools'
import { z } from 'zod'
import { tilesService, threeDService, portraitService } from '@/shared/data/generation/tiles-service'
import { validateApiKey, getServiceContext } from '../../core/auth'

// ============================================
// TOOL DEFINITIONS
// ============================================

// Tile generation
const generateTile = createTool({
  id: 'generate_tile',
  description:
    'Generate a tile image using AI. This triggers a Trigger.dev task and returns a run ID immediately. Use get_run_status to track progress.',
  inputSchema: z.object({
    projectId: z.string().uuid().describe('The project ID'),
    x: z.number().int().describe('X coordinate for the tile'),
    y: z.number().int().describe('Y coordinate for the tile'),
    prompt: z.string().describe('The prompt describing what to generate'),
    aiProvider: z
      .enum(['gemini', 'openai', 'stability', 'midjourney'])
      .describe('Which AI provider to use for generation'),
    isFirstTile: z
      .boolean()
      .optional()
      .describe('Whether this is the first tile in the project (default: true)'),
    styleReferenceUrls: z
      .array(z.string().url())
      .optional()
      .describe('URLs to style reference images (optional)'),
  }),
  execute: async ({ context: _ctx, data }) => {
    const apiKey = process.env.MCP_API_KEY
    if (!apiKey) throw new Error('MCP_API_KEY environment variable not set')

    const authResult = await validateApiKey(apiKey)
    if (!authResult.valid) throw new Error('Invalid API key')

    const context = await getServiceContext(authResult)

    return tilesService.generateTile(
      {
        projectId: data.projectId,
        x: data.x,
        y: data.y,
        prompt: data.prompt,
        aiProvider: data.aiProvider,
        isFirstTile: data.isFirstTile,
        aiConfig: data.aiConfig ?? {},
        styleReferenceUrls: data.styleReferenceUrls,
      },
      { userId: context.userId }
    )
  },
})

const upscaleTile = createTool({
  id: 'upscale_tile',
  description:
    'Upscale an existing tile to higher resolution. Triggers a Trigger.dev task and returns a run ID.',
  inputSchema: z.object({
    projectId: z.string().uuid().describe('The project ID'),
    tileId: z.string().uuid().describe('The tile ID to upscale'),
    upscaleProvider: z
      .enum(['midjourney', 'stability', 'topaz'])
      .optional()
      .describe('Which upscale provider to use (default: midjourney)'),
  }),
  execute: async ({ context: _ctx, data }) => {
    const apiKey = process.env.MCP_API_KEY
    if (!apiKey) throw new Error('MCP_API_KEY environment variable not set')

    const authResult = await validateApiKey(apiKey)
    if (!authResult.valid) throw new Error('Invalid API key')

    const context = await getServiceContext(authResult)

    return tilesService.upscaleTile(
      {
        projectId: data.projectId,
        tileId: data.tileId,
        upscaleProvider: data.upscaleProvider,
      },
      { userId: context.userId }
    )
  },
})

// 3D model generation
const generate3dModel = createTool({
  id: 'generate_3d_model',
  description: 'Generate a 3D model from text. Triggers a Trigger.dev task and returns a run ID.',
  inputSchema: z.object({
    projectId: z.string().uuid().describe('The project ID'),
    assetId: z.string().uuid().describe('The asset ID to attach the 3D model to'),
    prompt: z.string().describe('The prompt describing the 3D model to generate'),
  }),
  execute: async ({ context: _ctx, data }) => {
    const apiKey = process.env.MCP_API_KEY
    if (!apiKey) throw new Error('MCP_API_KEY environment variable not set')

    const authResult = await validateApiKey(apiKey)
    if (!authResult.valid) throw new Error('Invalid API key')

    const context = await getServiceContext(authResult)

    return threeDService.generate3DModel(
      {
        projectId: data.projectId,
        assetId: data.assetId,
        prompt: data.prompt,
      },
      { userId: context.userId }
    )
  },
})

const remesh3dModel = createTool({
  id: 'remesh_3d_model',
  description:
    'Remesh a 3D model to reduce polygon count. Triggers a Trigger.dev task and returns a run ID.',
  inputSchema: z.object({
    projectId: z.string().uuid().describe('The project ID'),
    assetId: z.string().uuid().describe('The asset ID with the 3D model to remesh'),
    targetPolycount: z
      .number()
      .int()
      .min(100)
      .max(100000)
      .optional()
      .describe('Target polygon count (optional)'),
  }),
  execute: async ({ context: _ctx, data }) => {
    const apiKey = process.env.MCP_API_KEY
    if (!apiKey) throw new Error('MCP_API_KEY environment variable not set')

    const authResult = await validateApiKey(apiKey)
    if (!authResult.valid) throw new Error('Invalid API key')

    const context = await getServiceContext(authResult)

    return threeDService.remesh3DModel(
      {
        projectId: data.projectId,
        assetId: data.assetId,
        targetPolycount: data.targetPolycount,
      },
      { userId: context.userId }
    )
  },
})

// Portrait generation
const generatePortrait = createTool({
  id: 'generate_portrait',
  description: 'Generate a character portrait. Triggers a Trigger.dev task and returns a run ID.',
  inputSchema: z.object({
    projectId: z.string().uuid().describe('The project ID'),
    characterId: z.string().uuid().describe('The character ID to generate a portrait for'),
    prompt: z.string().optional().describe('Additional prompt for the portrait (optional)'),
    style: z.string().optional().describe('Art style for the portrait (optional)'),
  }),
  execute: async ({ context: _ctx, data }) => {
    const apiKey = process.env.MCP_API_KEY
    if (!apiKey) throw new Error('MCP_API_KEY environment variable not set')

    const authResult = await validateApiKey(apiKey)
    if (!authResult.valid) throw new Error('Invalid API key')

    const context = await getServiceContext(authResult)

    return portraitService.generatePortrait(
      {
        projectId: data.projectId,
        characterId: data.characterId,
        prompt: data.prompt,
        style: data.style,
      },
      { userId: context.userId }
    )
  },
})

// Export tools
export const generationTools = {
  generateTile,
  upscaleTile,
  generate3dModel,
  remesh3dModel,
  generatePortrait,
}
