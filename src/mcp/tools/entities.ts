/**
 * Entities MCP Tools
 *
 * Tools for managing game entities across all domains.
 */

import { Tool } from '@modelcontextprotocol/sdk/types.js'
import { MCPServiceContext } from '../auth'
import { LangSmithContext } from '@/services/storyteller.service'
import { entitiesService, ServiceError } from '@/services'

// ============================================
// TOOL DEFINITIONS
// ============================================

export const tools: Tool[] = [
  {
    name: 'list_entities',
    description:
      'List game entities for a project with optional filtering by type or domain. Returns characters, locations, mechanics, factions, items, and quests.',
    inputSchema: {
      type: 'object',
      properties: {
        projectId: {
          type: 'string',
          format: 'uuid',
          description: 'The project ID to list entities for (required)',
        },
        entityType: {
          type: 'string',
          enum: ['character', 'location', 'mechanic', 'faction', 'item', 'quest'],
          description: 'Filter by entity type (optional)',
        },
        sourceDomain: {
          type: 'string',
          enum: ['storyteller', 'loop-creator', 'interior-designer', 'world-building'],
          description: 'Filter by source domain (optional)',
        },
        search: {
          type: 'string',
          description: 'Search term to filter by name or description (optional)',
        },
      },
      required: ['projectId'],
    },
  },
  {
    name: 'get_entity',
    description: 'Get a single game entity by its ID.',
    inputSchema: {
      type: 'object',
      properties: {
        entityId: {
          type: 'string',
          format: 'uuid',
          description: 'The entity ID to retrieve',
        },
      },
      required: ['entityId'],
    },
  },
  {
    name: 'create_entity',
    description:
      'Create a new game entity. Entities are cross-domain objects that can be referenced across storyteller, loop-creator, interior-designer, and world-building modules.',
    inputSchema: {
      type: 'object',
      properties: {
        projectId: {
          type: 'string',
          format: 'uuid',
          description: 'The project ID to create the entity in',
        },
        entityType: {
          type: 'string',
          enum: ['character', 'location', 'mechanic', 'faction', 'item', 'quest'],
          description: 'The type of entity to create',
        },
        name: {
          type: 'string',
          description: 'The name of the entity',
        },
        description: {
          type: 'string',
          description: 'A description of the entity (optional)',
        },
        sourceDomain: {
          type: 'string',
          enum: ['storyteller', 'loop-creator', 'interior-designer', 'world-building'],
          description: 'The domain where this entity originates',
        },
        metadata: {
          type: 'object',
          description: 'Additional metadata for the entity (optional)',
        },
        tags: {
          type: 'array',
          items: { type: 'string' },
          description: 'Tags for categorizing the entity (optional)',
        },
        imageUrl: {
          type: 'string',
          format: 'uri',
          description: 'URL to an image for the entity (optional)',
        },
      },
      required: ['projectId', 'entityType', 'name', 'sourceDomain'],
    },
  },
  {
    name: 'update_entity',
    description: 'Update an existing game entity.',
    inputSchema: {
      type: 'object',
      properties: {
        entityId: {
          type: 'string',
          format: 'uuid',
          description: 'The entity ID to update',
        },
        name: {
          type: 'string',
          description: 'New name for the entity (optional)',
        },
        description: {
          type: 'string',
          description: 'New description for the entity (optional)',
        },
        metadata: {
          type: 'object',
          description: 'Updated metadata (optional)',
        },
        tags: {
          type: 'array',
          items: { type: 'string' },
          description: 'Updated tags (optional)',
        },
        imageUrl: {
          type: 'string',
          format: 'uri',
          description: 'Updated image URL (optional)',
        },
      },
      required: ['entityId'],
    },
  },
  {
    name: 'delete_entity',
    description: 'Delete a game entity.',
    inputSchema: {
      type: 'object',
      properties: {
        entityId: {
          type: 'string',
          format: 'uuid',
          description: 'The entity ID to delete',
        },
      },
      required: ['entityId'],
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
  list_entities: async (args, context) => {
    return entitiesService.list(
      {
        projectId: args.projectId,
        entityType: args.entityType,
        sourceDomain: args.sourceDomain,
        search: args.search,
      },
      { userId: context.userId, supabase: context.supabase }
    )
  },

  get_entity: async (args, context) => {
    return entitiesService.get(args.entityId, {
      userId: context.userId,
      supabase: context.supabase,
    })
  },

  create_entity: async (args, context) => {
    return entitiesService.create(
      {
        projectId: args.projectId,
        entityType: args.entityType,
        name: args.name,
        description: args.description,
        sourceDomain: args.sourceDomain,
        metadata: args.metadata,
        tags: args.tags,
        imageUrl: args.imageUrl,
      },
      { userId: context.userId, supabase: context.supabase }
    )
  },

  update_entity: async (args, context) => {
    const { entityId, ...updateData } = args
    return entitiesService.update(entityId, updateData, {
      userId: context.userId,
      supabase: context.supabase,
    })
  },

  delete_entity: async (args, context) => {
    return entitiesService.delete(args.entityId, {
      userId: context.userId,
      supabase: context.supabase,
    })
  },
}

