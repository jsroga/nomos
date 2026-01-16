/**
 * Storyteller MCP Tools
 *
 * Tools for interacting with the storyteller domain - characters, episodes, beats, and chat.
 */

import { Tool } from '@modelcontextprotocol/sdk/types.js'
import { MCPServiceContext } from '../auth'
import { LangSmithContext } from '@/services/storyteller.service'
import { storytellerService } from '@/services'

// ============================================
// TOOL DEFINITIONS
// ============================================

export const tools: Tool[] = [
  // Character tools
  {
    name: 'list_characters',
    description: 'List all characters in a project.',
    inputSchema: {
      type: 'object',
      properties: {
        projectId: {
          type: 'string',
          format: 'uuid',
          description: 'The project ID to list characters for',
        },
      },
      required: ['projectId'],
    },
  },
  {
    name: 'get_character',
    description: 'Get a single character by ID.',
    inputSchema: {
      type: 'object',
      properties: {
        characterId: {
          type: 'string',
          format: 'uuid',
          description: 'The character ID to retrieve',
        },
      },
      required: ['characterId'],
    },
  },
  {
    name: 'create_character',
    description:
      'Create a new character in a project. Characters have personality metrics, MBTI types, and voice signatures.',
    inputSchema: {
      type: 'object',
      properties: {
        projectId: {
          type: 'string',
          format: 'uuid',
          description: 'The project ID to create the character in',
        },
        name: {
          type: 'string',
          description: 'The character name',
        },
        role: {
          type: 'string',
          enum: ['Lead', 'Supporting', 'Background'],
          description: 'The character role (default: Supporting)',
        },
        gender: {
          type: 'string',
          description: 'The character gender',
        },
        characterPrompt: {
          type: 'string',
          description: 'AI prompt for generating this character',
        },
        description: {
          type: 'string',
          description: 'Character description',
        },
        mbti: {
          type: 'string',
          description: 'MBTI personality type (e.g., INTJ, ENFP)',
        },
        voiceSignature: {
          type: 'string',
          description: 'Description of how the character speaks',
        },
        stress: {
          type: 'number',
          minimum: 0,
          maximum: 100,
          description: 'Stress level (0-100, default: 30)',
        },
        trust: {
          type: 'number',
          minimum: 0,
          maximum: 100,
          description: 'Trust level (0-100, default: 50)',
        },
        power: {
          type: 'number',
          minimum: 0,
          maximum: 100,
          description: 'Power level (0-100, default: 30)',
        },
        morality: {
          type: 'number',
          minimum: 0,
          maximum: 100,
          description: 'Morality level (0-100, default: 50)',
        },
        hope: {
          type: 'number',
          minimum: 0,
          maximum: 100,
          description: 'Hope level (0-100, default: 60)',
        },
        isolation: {
          type: 'number',
          minimum: 0,
          maximum: 100,
          description: 'Isolation level (0-100, default: 20)',
        },
        transformation: {
          type: 'number',
          minimum: 0,
          maximum: 100,
          description: 'Transformation progress (0-100, default: 0)',
        },
      },
      required: ['projectId', 'name'],
    },
  },
  {
    name: 'update_character',
    description: 'Update an existing character.',
    inputSchema: {
      type: 'object',
      properties: {
        characterId: {
          type: 'string',
          format: 'uuid',
          description: 'The character ID to update',
        },
        name: { type: 'string' },
        role: { type: 'string', enum: ['Lead', 'Supporting', 'Background'] },
        gender: { type: 'string' },
        characterPrompt: { type: 'string' },
        description: { type: 'string' },
        mbti: { type: 'string' },
        voiceSignature: { type: 'string' },
        psychology: { type: 'string' },
        stress: { type: 'number', minimum: 0, maximum: 100 },
        trust: { type: 'number', minimum: 0, maximum: 100 },
        power: { type: 'number', minimum: 0, maximum: 100 },
        morality: { type: 'number', minimum: 0, maximum: 100 },
        hope: { type: 'number', minimum: 0, maximum: 100 },
        isolation: { type: 'number', minimum: 0, maximum: 100 },
        transformation: { type: 'number', minimum: 0, maximum: 100 },
      },
      required: ['characterId'],
    },
  },
  {
    name: 'delete_character',
    description: 'Delete a character.',
    inputSchema: {
      type: 'object',
      properties: {
        characterId: {
          type: 'string',
          format: 'uuid',
          description: 'The character ID to delete',
        },
      },
      required: ['characterId'],
    },
  },

  // Episode tools
  {
    name: 'list_episodes',
    description: 'List all episodes in a project.',
    inputSchema: {
      type: 'object',
      properties: {
        projectId: {
          type: 'string',
          format: 'uuid',
          description: 'The project ID to list episodes for',
        },
      },
      required: ['projectId'],
    },
  },

  // Beat tools
  {
    name: 'list_beats',
    description: 'List all beats in an episode. Beats are the story moments that make up an episode.',
    inputSchema: {
      type: 'object',
      properties: {
        episodeId: {
          type: 'string',
          format: 'uuid',
          description: 'The episode ID to list beats for',
        },
      },
      required: ['episodeId'],
    },
  },

  // Series bible
  {
    name: 'get_series_bible',
    description:
      'Get the series bible for a project. The series bible contains world description, key characters, factions, and story plan.',
    inputSchema: {
      type: 'object',
      properties: {
        projectId: {
          type: 'string',
          format: 'uuid',
          description: 'The project ID to get the series bible for',
        },
      },
      required: ['projectId'],
    },
  },

  // Chat / Writers Room
  {
    name: 'storyteller_chat',
    description:
      'Send a message to the storyteller writers room and get a response. This invokes the LangGraph multi-agent workflow with supervisor, planner, and specialist agents. All calls are traced in LangSmith.',
    inputSchema: {
      type: 'object',
      properties: {
        projectId: {
          type: 'string',
          format: 'uuid',
          description: 'The project ID for context',
        },
        message: {
          type: 'string',
          description: 'The message to send to the writers room',
        },
        threadId: {
          type: 'string',
          description:
            'Thread ID for conversation continuity. If not provided, a new thread will be created.',
        },
        episodeId: {
          type: 'string',
          format: 'uuid',
          description: 'Episode ID for episode-specific context (optional)',
        },
      },
      required: ['projectId', 'message'],
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
  // Character handlers
  list_characters: async (args, context) => {
    return storytellerService.listCharacters(
      { projectId: args.projectId },
      { userId: context.userId }
    )
  },

  get_character: async (args, context) => {
    return storytellerService.getCharacter(args.characterId, { userId: context.userId })
  },

  create_character: async (args, context) => {
    return storytellerService.createCharacter(args, { userId: context.userId })
  },

  update_character: async (args, context) => {
    const { characterId, ...updateData } = args
    return storytellerService.updateCharacter(characterId, updateData, {
      userId: context.userId,
    })
  },

  delete_character: async (args, context) => {
    return storytellerService.deleteCharacter(args.characterId, { userId: context.userId })
  },

  // Episode handlers
  list_episodes: async (args, context) => {
    return storytellerService.listEpisodes(
      { projectId: args.projectId },
      { userId: context.userId }
    )
  },

  // Beat handlers
  list_beats: async (args, context) => {
    return storytellerService.listBeats({ episodeId: args.episodeId }, { userId: context.userId })
  },

  // Series bible handler
  get_series_bible: async (args, context) => {
    return storytellerService.getSeriesBible(args.projectId, { userId: context.userId })
  },

  // Chat handler - invokes LangGraph workflow with LangSmith tracing
  storyteller_chat: async (args, context, langsmith) => {
    // Merge MCP LangSmith context with storyteller-specific context
    const enhancedLangsmith: LangSmithContext = {
      runName: langsmith.runName || `MCP: storyteller_chat`,
      tags: [
        ...(langsmith.tags || []),
        'storyteller',
        'chat',
        'writers-room',
        args.threadId ? 'continued-thread' : 'new-thread',
      ],
      metadata: {
        ...langsmith.metadata,
        projectId: args.projectId,
        threadId: args.threadId,
        episodeId: args.episodeId,
        messageLength: args.message.length,
      },
    }

    return storytellerService.chat(
      {
        projectId: args.projectId,
        message: args.message,
        threadId: args.threadId,
        episodeId: args.episodeId,
      },
      { userId: context.userId },
      enhancedLangsmith
    )
  },
}

