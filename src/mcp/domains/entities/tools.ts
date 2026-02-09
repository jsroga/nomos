/**
 * Entities MCP Tools
 *
 * Tools for managing game entities across all domains.
 */

import { createTool } from '@mastra/core/tools'
import { z } from 'zod'
import { entitiesService } from '@/services'
import { validateApiKey, getServiceContext } from '../../core/auth'

// ============================================
// TOOL DEFINITIONS
// ============================================

const listEntities = createTool({
  id: 'list_entities',
  description:
    'List game entities for a project with optional filtering by type or domain. Returns characters, locations, mechanics, factions, items, and quests.',
  schema: z.object({
    projectId: z.string().uuid().describe('The project ID to list entities for (required)'),
    entityType: z
      .enum(['character', 'location', 'mechanic', 'faction', 'item', 'quest'])
      .optional()
      .describe('Filter by entity type (optional)'),
    sourceDomain: z
      .enum(['storyteller', 'loop-creator', 'interior-designer', 'world-building'])
      .optional()
      .describe('Filter by source domain (optional)'),
    search: z
      .string()
      .optional()
      .describe('Search term to filter by name or description (optional)'),
  }),
  execute: async ({ context: _ctx, data }) => {
    const apiKey = process.env.MCP_API_KEY
    if (!apiKey) throw new Error('MCP_API_KEY environment variable not set')

    const authResult = await validateApiKey(apiKey)
    if (!authResult.valid) throw new Error('Invalid API key')

    const context = await getServiceContext(authResult)

    return entitiesService.list(
      {
        projectId: data.projectId,
        entityType: data.entityType,
        sourceDomain: data.sourceDomain,
        search: data.search,
      },
      { userId: context.userId, supabase: context.supabase }
    )
  },
})

const getEntity = createTool({
  id: 'get_entity',
  description: 'Get a single game entity by its ID.',
  schema: z.object({
    entityId: z.string().uuid().describe('The entity ID to retrieve'),
  }),
  execute: async ({ context: _ctx, data }) => {
    const apiKey = process.env.MCP_API_KEY
    if (!apiKey) throw new Error('MCP_API_KEY environment variable not set')

    const authResult = await validateApiKey(apiKey)
    if (!authResult.valid) throw new Error('Invalid API key')

    const context = await getServiceContext(authResult)

    return entitiesService.get(data.entityId, {
      userId: context.userId,
      supabase: context.supabase,
    })
  },
})

const createEntity = createTool({
  id: 'create_entity',
  description:
    'Create a new game entity. Entities are cross-domain objects that can be referenced across storyteller, loop-creator, interior-designer, and world-building modules.',
  schema: z.object({
    projectId: z.string().uuid().describe('The project ID to create the entity in'),
    entityType: z
      .enum(['character', 'location', 'mechanic', 'faction', 'item', 'quest'])
      .describe('The type of entity to create'),
    name: z.string().describe('The name of the entity'),
    description: z.string().optional().describe('A description of the entity (optional)'),
    sourceDomain: z
      .enum(['storyteller', 'loop-creator', 'interior-designer', 'world-building'])
      .describe('The domain where this entity originates'),
    metadata: z
      .record(z.any())
      .optional()
      .describe('Additional metadata for the entity (optional)'),
    tags: z.array(z.string()).optional().describe('Tags for categorizing the entity (optional)'),
    imageUrl: z.string().url().optional().describe('URL to an image for the entity (optional)'),
  }),
  execute: async ({ context: _ctx, data }) => {
    const apiKey = process.env.MCP_API_KEY
    if (!apiKey) throw new Error('MCP_API_KEY environment variable not set')

    const authResult = await validateApiKey(apiKey)
    if (!authResult.valid) throw new Error('Invalid API key')

    const context = await getServiceContext(authResult)

    return entitiesService.create(
      {
        projectId: data.projectId,
        entityType: data.entityType,
        name: data.name,
        description: data.description,
        sourceDomain: data.sourceDomain,
        metadata: data.metadata,
        tags: data.tags,
        imageUrl: data.imageUrl,
      },
      { userId: context.userId, supabase: context.supabase }
    )
  },
})

const updateEntity = createTool({
  id: 'update_entity',
  description: 'Update an existing game entity.',
  schema: z.object({
    entityId: z.string().uuid().describe('The entity ID to update'),
    name: z.string().optional().describe('New name for the entity (optional)'),
    description: z.string().optional().describe('New description for the entity (optional)'),
    metadata: z.record(z.any()).optional().describe('Updated metadata (optional)'),
    tags: z.array(z.string()).optional().describe('Updated tags (optional)'),
    imageUrl: z.string().url().optional().describe('Updated image URL (optional)'),
  }),
  execute: async ({ context: _ctx, data }) => {
    const apiKey = process.env.MCP_API_KEY
    if (!apiKey) throw new Error('MCP_API_KEY environment variable not set')

    const authResult = await validateApiKey(apiKey)
    if (!authResult.valid) throw new Error('Invalid API key')

    const context = await getServiceContext(authResult)

    const { entityId, ...updateData } = data
    return entitiesService.update(entityId, updateData, {
      userId: context.userId,
      supabase: context.supabase,
    })
  },
})

const deleteEntity = createTool({
  id: 'delete_entity',
  description: 'Delete a game entity.',
  schema: z.object({
    entityId: z.string().uuid().describe('The entity ID to delete'),
  }),
  execute: async ({ context: _ctx, data }) => {
    const apiKey = process.env.MCP_API_KEY
    if (!apiKey) throw new Error('MCP_API_KEY environment variable not set')

    const authResult = await validateApiKey(apiKey)
    if (!authResult.valid) throw new Error('Invalid API key')

    const context = await getServiceContext(authResult)

    return entitiesService.delete(data.entityId, {
      userId: context.userId,
      supabase: context.supabase,
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
