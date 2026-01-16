/**
 * Tiles & Generation MCP Tools
 *
 * Tools for generating tiles, 3D models, portraits via Trigger.dev tasks.
 */

import { Tool } from '@modelcontextprotocol/sdk/types.js'
import { MCPServiceContext } from '../auth'
import { LangSmithContext } from '@/services/storyteller.service'
import { tilesService, threeDService, portraitService } from '@/services'

// ============================================
// TOOL DEFINITIONS
// ============================================

export const tools: Tool[] = [
  // Tile generation
  {
    name: 'generate_tile',
    description:
      'Generate a tile image using AI. This triggers a Trigger.dev task and returns a run ID immediately. Use get_run_status to track progress.',
    inputSchema: {
      type: 'object',
      properties: {
        projectId: {
          type: 'string',
          format: 'uuid',
          description: 'The project ID',
        },
        x: {
          type: 'integer',
          description: 'X coordinate for the tile',
        },
        y: {
          type: 'integer',
          description: 'Y coordinate for the tile',
        },
        prompt: {
          type: 'string',
          description: 'The prompt describing what to generate',
        },
        aiProvider: {
          type: 'string',
          enum: ['gemini', 'openai', 'stability', 'midjourney'],
          description: 'Which AI provider to use for generation',
        },
        isFirstTile: {
          type: 'boolean',
          description: 'Whether this is the first tile in the project (default: true)',
        },
        styleReferenceUrls: {
          type: 'array',
          items: { type: 'string', format: 'uri' },
          description: 'URLs to style reference images (optional)',
        },
      },
      required: ['projectId', 'x', 'y', 'prompt', 'aiProvider'],
    },
  },
  {
    name: 'upscale_tile',
    description:
      'Upscale an existing tile to higher resolution. Triggers a Trigger.dev task and returns a run ID.',
    inputSchema: {
      type: 'object',
      properties: {
        projectId: {
          type: 'string',
          format: 'uuid',
          description: 'The project ID',
        },
        tileId: {
          type: 'string',
          format: 'uuid',
          description: 'The tile ID to upscale',
        },
        upscaleProvider: {
          type: 'string',
          enum: ['midjourney', 'stability', 'topaz'],
          description: 'Which upscale provider to use (default: midjourney)',
        },
      },
      required: ['projectId', 'tileId'],
    },
  },

  // 3D model generation
  {
    name: 'generate_3d_model',
    description:
      'Generate a 3D model from text. Triggers a Trigger.dev task and returns a run ID.',
    inputSchema: {
      type: 'object',
      properties: {
        projectId: {
          type: 'string',
          format: 'uuid',
          description: 'The project ID',
        },
        assetId: {
          type: 'string',
          format: 'uuid',
          description: 'The asset ID to attach the 3D model to',
        },
        prompt: {
          type: 'string',
          description: 'The prompt describing the 3D model to generate',
        },
      },
      required: ['projectId', 'assetId', 'prompt'],
    },
  },
  {
    name: 'remesh_3d_model',
    description:
      'Remesh a 3D model to reduce polygon count. Triggers a Trigger.dev task and returns a run ID.',
    inputSchema: {
      type: 'object',
      properties: {
        projectId: {
          type: 'string',
          format: 'uuid',
          description: 'The project ID',
        },
        assetId: {
          type: 'string',
          format: 'uuid',
          description: 'The asset ID with the 3D model to remesh',
        },
        targetPolycount: {
          type: 'integer',
          minimum: 100,
          maximum: 100000,
          description: 'Target polygon count (optional)',
        },
      },
      required: ['projectId', 'assetId'],
    },
  },

  // Portrait generation
  {
    name: 'generate_portrait',
    description:
      'Generate a character portrait. Triggers a Trigger.dev task and returns a run ID.',
    inputSchema: {
      type: 'object',
      properties: {
        projectId: {
          type: 'string',
          format: 'uuid',
          description: 'The project ID',
        },
        characterId: {
          type: 'string',
          format: 'uuid',
          description: 'The character ID to generate a portrait for',
        },
        prompt: {
          type: 'string',
          description: 'Additional prompt for the portrait (optional)',
        },
        style: {
          type: 'string',
          description: 'Art style for the portrait (optional)',
        },
      },
      required: ['projectId', 'characterId'],
    },
  },
]

// ============================================
// HANDLERS
// ============================================

export const handlers: Record<
  string,
  (args: Record<string, any>, context: MCPServiceContext, langsmith: LangSmithContext) => Promise<any>
> = {
  generate_tile: async (args, context) => {
    return tilesService.generateTile(
      {
        projectId: args.projectId,
        x: args.x,
        y: args.y,
        prompt: args.prompt,
        aiProvider: args.aiProvider,
        isFirstTile: args.isFirstTile,
        styleReferenceUrls: args.styleReferenceUrls,
      },
      { userId: context.userId }
    )
  },

  upscale_tile: async (args, context) => {
    return tilesService.upscaleTile(
      {
        projectId: args.projectId,
        tileId: args.tileId,
        upscaleProvider: args.upscaleProvider,
      },
      { userId: context.userId }
    )
  },

  generate_3d_model: async (args, context) => {
    return threeDService.generate3DModel(
      {
        projectId: args.projectId,
        assetId: args.assetId,
        prompt: args.prompt,
      },
      { userId: context.userId }
    )
  },

  remesh_3d_model: async (args, context) => {
    return threeDService.remesh3DModel(
      {
        projectId: args.projectId,
        assetId: args.assetId,
        targetPolycount: args.targetPolycount,
      },
      { userId: context.userId }
    )
  },

  generate_portrait: async (args, context) => {
    return portraitService.generatePortrait(
      {
        projectId: args.projectId,
        characterId: args.characterId,
        prompt: args.prompt,
        style: args.style,
      },
      { userId: context.userId }
    )
  },
}

