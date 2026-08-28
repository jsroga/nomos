/**
 * Entities MCP Tools
 *
 * Tools for managing game entities across all domains.
 */

import { env } from '@/shared/config/env'
import { createTool } from '@mastra/core/tools'
import { z } from 'zod'
import { entitiesService } from '@/shared/data/entities-service'
import { AppModuleId, GameEntityKind } from '@/shared/data/constants/protocol'
import { validateApiKey, getServiceContext } from '../../core/auth'

// ============================================
// TOOL DEFINITIONS
// ============================================

const listEntities = createTool({
  id: 'list_entities',
  description:
    'List game entities for a project with optional filtering by type or domain. Returns characters, locations, mechanics, factions, items, and quests.',
  inputSchema: z.object({
    projectId: z.string().uuid().describe('The project ID to list entities for (required)'),
    entityType: z.nativeEnum(GameEntityKind).optional().describe('Filter by entity type (optional)'),
    sourceDomain: z
      .nativeEnum(AppModuleId)
      .optional()
      .describe('Filter by source domain (optional)'),
    search: z
      .string()
      .optional()
      .describe('Search term to filter by name or description (optional)'),
  }),
  execute: async (input) => {
    const apiKey = env.MCP_API_KEY
    if (!apiKey) throw new Error('MCP_API_KEY environment variable not set')

    const authResult = await validateApiKey(apiKey)
    if (!authResult.valid) throw new Error('Invalid API key')

    const serviceContext = await getServiceContext(authResult)

    return entitiesService.list(
      {
        projectId: input.projectId,
        entityType: input.entityType,
        sourceDomain: input.sourceDomain,
        search: input.search,
      },
      { userId: serviceContext.userId, supabase: serviceContext.supabase }
    )
  },
})

const getEntity = createTool({
  id: 'get_entity',
  description: 'Get a single game entity by its ID.',
  inputSchema: z.object({
    entityId: z.string().uuid().describe('The entity ID to retrieve'),
  }),
  execute: async (input) => {
    const apiKey = env.MCP_API_KEY
    if (!apiKey) throw new Error('MCP_API_KEY environment variable not set')

    const authResult = await validateApiKey(apiKey)
    if (!authResult.valid) throw new Error('Invalid API key')

    const serviceContext = await getServiceContext(authResult)

    return entitiesService.get(input.entityId, {
      userId: serviceContext.userId,
      supabase: serviceContext.supabase,
    })
  },
})

const createEntity = createTool({
  id: 'create_entity',
  description:
    'Create a new game entity. Entities are cross-domain objects that can be referenced across storyteller, loop-creator, 3d-canvas, and 2d-canvas modules.',
  inputSchema: z.object({
    projectId: z.string().uuid().describe('The project ID to create the entity in'),
    entityType: z.nativeEnum(GameEntityKind).describe('The type of entity to create'),
    name: z.string().describe('The name of the entity'),
    description: z.string().optional().describe('A description of the entity (optional)'),
    sourceDomain: z
      .nativeEnum(AppModuleId)
      .describe('The domain where this entity originates'),
    metadata: z
      .record(z.any())
      .optional()
      .describe('Additional metadata for the entity (optional)'),
    tags: z.array(z.string()).optional().describe('Tags for categorizing the entity (optional)'),
    imageUrl: z.string().url().optional().describe('URL to an image for the entity (optional)'),
  }),
  execute: async (input) => {
    const apiKey = env.MCP_API_KEY
    if (!apiKey) throw new Error('MCP_API_KEY environment variable not set')

    const authResult = await validateApiKey(apiKey)
    if (!authResult.valid) throw new Error('Invalid API key')

    const serviceContext = await getServiceContext(authResult)

    return entitiesService.create(
      {
        projectId: input.projectId,
        entityType: input.entityType,
        name: input.name,
        description: input.description,
        sourceDomain: input.sourceDomain,
        metadata: input.metadata,
        tags: input.tags,
        imageUrl: input.imageUrl,
      },
      { userId: serviceContext.userId, supabase: serviceContext.supabase }
    )
  },
})

const updateEntity = createTool({
  id: 'update_entity',
  description: 'Update an existing game entity.',
  inputSchema: z.object({
    entityId: z.string().uuid().describe('The entity ID to update'),
    name: z.string().optional().describe('New name for the entity (optional)'),
    description: z.string().optional().describe('New description for the entity (optional)'),
    metadata: z.record(z.any()).optional().describe('Updated metadata (optional)'),
    tags: z.array(z.string()).optional().describe('Updated tags (optional)'),
    imageUrl: z.string().url().optional().describe('Updated image URL (optional)'),
  }),
  execute: async (input) => {
    const apiKey = env.MCP_API_KEY
    if (!apiKey) throw new Error('MCP_API_KEY environment variable not set')

    const authResult = await validateApiKey(apiKey)
    if (!authResult.valid) throw new Error('Invalid API key')

    const serviceContext = await getServiceContext(authResult)

    const { entityId, ...updateData } = input
    return entitiesService.update(entityId, updateData, {
      userId: serviceContext.userId,
      supabase: serviceContext.supabase,
    })
  },
})

const deleteEntity = createTool({
  id: 'delete_entity',
  description: 'Delete a game entity.',
  inputSchema: z.object({
    entityId: z.string().uuid().describe('The entity ID to delete'),
  }),
  execute: async (input) => {
    const apiKey = env.MCP_API_KEY
    if (!apiKey) throw new Error('MCP_API_KEY environment variable not set')

    const authResult = await validateApiKey(apiKey)
    if (!authResult.valid) throw new Error('Invalid API key')

    const serviceContext = await getServiceContext(authResult)

    return entitiesService.delete(input.entityId, {
      userId: serviceContext.userId,
      supabase: serviceContext.supabase,
    })
  },
})

// Export tools as an object or array to be used in the agent
export const entitiesTools = {
  listEntities,
  getEntity,
  createEntity,
  updateEntity,
  deleteEntity,
}
