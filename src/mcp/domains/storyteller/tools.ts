/**
 * Storyteller MCP Tools
 *
 * Tools for interacting with the storyteller domain - characters, episodes, beats, and chat.
 */

import { createTool } from '@mastra/core/tools'
import { z } from 'zod'
import { storytellerService } from '@/domains/storyteller/server'
import { validateApiKey, getServiceContext } from '../../core/auth'
import { LangSmithContext } from '../../core/types'

// ============================================
// TOOL DEFINITIONS
// ============================================

const listCharacters = createTool({
  id: 'list_characters',
  description: 'List all characters in a project.',
  inputSchema: z.object({
    projectId: z.string().uuid().describe('The project ID to list characters for'),
  }),
  execute: async ({ context: _ctx, data }) => {
    const apiKey = process.env.MCP_API_KEY
    if (!apiKey) throw new Error('MCP_API_KEY environment variable not set')

    const authResult = await validateApiKey(apiKey)
    if (!authResult.valid) throw new Error('Invalid API key')

    const context = await getServiceContext(authResult)

    return storytellerService.listCharacters(
      { projectId: data.projectId },
      { userId: context.userId }
    )
  },
})

const getCharacter = createTool({
  id: 'get_character',
  description: 'Get a single character by ID.',
  inputSchema: z.object({
    characterId: z.string().uuid().describe('The character ID to retrieve'),
  }),
  execute: async ({ context: _ctx, data }) => {
    const apiKey = process.env.MCP_API_KEY
    if (!apiKey) throw new Error('MCP_API_KEY environment variable not set')

    const authResult = await validateApiKey(apiKey)
    if (!authResult.valid) throw new Error('Invalid API key')

    const context = await getServiceContext(authResult)

    return storytellerService.getCharacter(data.characterId, { userId: context.userId })
  },
})

const createCharacter = createTool({
  id: 'create_character',
  description:
    'Create a new character in a project. Characters have personality metrics, MBTI types, and voice signatures.',
  inputSchema: z.object({
    projectId: z.string().uuid().describe('The project ID to create the character in'),
    name: z.string().describe('The character name'),
    role: z
      .enum(['Lead', 'Supporting', 'Background'])
      .optional()
      .describe('The character role (default: Supporting)'),
    gender: z.string().optional().describe('The character gender'),
    characterPrompt: z.string().optional().describe('AI prompt for generating this character'),
    description: z.string().optional().describe('Character description'),
    mbti: z.string().optional().describe('MBTI personality type (e.g., INTJ, ENFP)'),
    voiceSignature: z.string().optional().describe('Description of how the character speaks'),
    stress: z.number().min(0).max(100).optional().describe('Stress level (0-100, default: 30)'),
    trust: z.number().min(0).max(100).optional().describe('Trust level (0-100, default: 50)'),
    power: z.number().min(0).max(100).optional().describe('Power level (0-100, default: 30)'),
    morality: z.number().min(0).max(100).optional().describe('Morality level (0-100, default: 50)'),
    hope: z.number().min(0).max(100).optional().describe('Hope level (0-100, default: 60)'),
    isolation: z
      .number()
      .min(0)
      .max(100)
      .optional()
      .describe('Isolation level (0-100, default: 20)'),
    transformation: z
      .number()
      .min(0)
      .max(100)
      .optional()
      .describe('Transformation progress (0-100, default: 0)'),
  }),
  execute: async ({ context: _ctx, data }) => {
    const apiKey = process.env.MCP_API_KEY
    if (!apiKey) throw new Error('MCP_API_KEY environment variable not set')

    const authResult = await validateApiKey(apiKey)
    if (!authResult.valid) throw new Error('Invalid API key')

    const context = await getServiceContext(authResult)

    return storytellerService.createCharacter(data, { userId: context.userId })
  },
})

const updateCharacter = createTool({
  id: 'update_character',
  description: 'Update an existing character.',
  inputSchema: z.object({
    characterId: z.string().uuid().describe('The character ID to update'),
    name: z.string().optional(),
    role: z.enum(['Lead', 'Supporting', 'Background']).optional(),
    gender: z.string().optional(),
    characterPrompt: z.string().optional(),
    description: z.string().optional(),
    mbti: z.string().optional(),
    voiceSignature: z.string().optional(),
    psychology: z.string().optional(),
    stress: z.number().min(0).max(100).optional(),
    trust: z.number().min(0).max(100).optional(),
    power: z.number().min(0).max(100).optional(),
    morality: z.number().min(0).max(100).optional(),
    hope: z.number().min(0).max(100).optional(),
    isolation: z.number().min(0).max(100).optional(),
    transformation: z.number().min(0).max(100).optional(),
  }),
  execute: async ({ context: _ctx, data }) => {
    const apiKey = process.env.MCP_API_KEY
    if (!apiKey) throw new Error('MCP_API_KEY environment variable not set')

    const authResult = await validateApiKey(apiKey)
    if (!authResult.valid) throw new Error('Invalid API key')

    const context = await getServiceContext(authResult)

    const { characterId, ...updateData } = data
    return storytellerService.updateCharacter(characterId, updateData, {
      userId: context.userId,
    })
  },
})

const deleteCharacter = createTool({
  id: 'delete_character',
  description: 'Delete a character.',
  inputSchema: z.object({
    characterId: z.string().uuid().describe('The character ID to delete'),
  }),
  execute: async ({ context: _ctx, data }) => {
    const apiKey = process.env.MCP_API_KEY
    if (!apiKey) throw new Error('MCP_API_KEY environment variable not set')

    const authResult = await validateApiKey(apiKey)
    if (!authResult.valid) throw new Error('Invalid API key')

    const context = await getServiceContext(authResult)

    return storytellerService.deleteCharacter(data.characterId, { userId: context.userId })
  },
})

// Episode tools
const listEpisodes = createTool({
  id: 'list_episodes',
  description: 'List all episodes in a project.',
  inputSchema: z.object({
    projectId: z.string().uuid().describe('The project ID to list episodes for'),
  }),
  execute: async ({ context: _ctx, data }) => {
    const apiKey = process.env.MCP_API_KEY
    if (!apiKey) throw new Error('MCP_API_KEY environment variable not set')

    const authResult = await validateApiKey(apiKey)
    if (!authResult.valid) throw new Error('Invalid API key')

    const context = await getServiceContext(authResult)

    return storytellerService.listEpisodes(
      { projectId: data.projectId },
      { userId: context.userId }
    )
  },
})

// Beat tools
const listBeats = createTool({
  id: 'list_beats',
  description: 'List all beats in an episode. Beats are the story moments that make up an episode.',
  inputSchema: z.object({
    episodeId: z.string().uuid().describe('The episode ID to list beats for'),
  }),
  execute: async ({ context: _ctx, data }) => {
    const apiKey = process.env.MCP_API_KEY
    if (!apiKey) throw new Error('MCP_API_KEY environment variable not set')

    const authResult = await validateApiKey(apiKey)
    if (!authResult.valid) throw new Error('Invalid API key')

    const context = await getServiceContext(authResult)

    return storytellerService.listBeats({ episodeId: data.episodeId }, { userId: context.userId })
  },
})

// Series bible
const getSeriesBible = createTool({
  id: 'get_series_bible',
  description:
    'Get the series bible for a project. The series bible contains world description, key characters, factions, and story plan.',
  inputSchema: z.object({
    projectId: z.string().uuid().describe('The project ID to get the series bible for'),
  }),
  execute: async ({ context: _ctx, data }) => {
    const apiKey = process.env.MCP_API_KEY
    if (!apiKey) throw new Error('MCP_API_KEY environment variable not set')

    const authResult = await validateApiKey(apiKey)
    if (!authResult.valid) throw new Error('Invalid API key')

    const context = await getServiceContext(authResult)

    return storytellerService.getSeriesBible(data.projectId, { userId: context.userId })
  },
})

// Chat / Writers Room
const storytellerChat = createTool({
  id: 'storyteller_chat',
  description:
    'Send a message to the storyteller writers room and get a response. This invokes the LangGraph multi-agent workflow with supervisor, planner, and specialist agents. All calls are traced in LangSmith.',
  inputSchema: z.object({
    projectId: z.string().uuid().describe('The project ID for context'),
    message: z.string().describe('The message to send to the writers room'),
    threadId: z
      .string()
      .optional()
      .describe(
        'Thread ID for conversation continuity. If not provided, a new thread will be created.'
      ),
    episodeId: z
      .string()
      .uuid()
      .optional()
      .describe('Episode ID for episode-specific context (optional)'),
  }),
  execute: async ({ context: _ctx, data }) => {
    const apiKey = process.env.MCP_API_KEY
    if (!apiKey) throw new Error('MCP_API_KEY environment variable not set')

    const authResult = await validateApiKey(apiKey)
    if (!authResult.valid) throw new Error('Invalid API key')

    const context = await getServiceContext(authResult)

    // Reconstruct simplified LangSmith context for now
    const enhancedLangsmith: LangSmithContext = {
      runName: 'MCP: storyteller_chat',
      tags: [
        'storyteller',
        'chat',
        'writers-room',
        data.threadId ? 'continued-thread' : 'new-thread',
      ],
      metadata: {
        source: 'mcp',
        apiKeyId: authResult.keyId,
        apiKeyName: authResult.keyName,
        projectId: data.projectId,
        threadId: data.threadId,
        episodeId: data.episodeId,
        messageLength: data.message.length,
      },
    }

    return storytellerService.chat(
      {
        projectId: data.projectId,
        message: data.message,
        threadId: data.threadId,
        episodeId: data.episodeId,
      },
      { userId: context.userId },
      enhancedLangsmith
    )
  },
})

// Export tools
export const storytellerTools = {
  listCharacters,
  getCharacter,
  createCharacter,
  updateCharacter,
  deleteCharacter,
  listEpisodes,
  listBeats,
  getSeriesBible,
  storytellerChat,
}
