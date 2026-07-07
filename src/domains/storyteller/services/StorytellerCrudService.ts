import 'server-only'

/**
 * Storyteller Service
 *
 * Shared business logic for storyteller domain operations.
 * Used by both REST API and MCP server.
 */

import { db } from '@/db/client'
import { characters, projects, episodes, beats } from '@/domains/storyteller/db/schema'
import { eq, desc } from 'drizzle-orm'
import { z } from 'zod'
import type { WritersRoomState } from '@/domains/storyteller/core/types/StoryTypes'

type LangsmithTraceConfig = {
  runName?: string
  tags?: string[]
  metadata?: Record<string, unknown>
  configurable?: Record<string, unknown>
}

// ============================================
// SCHEMAS
// ============================================

export const listCharactersSchema = z.object({
  projectId: z.string().uuid(),
})

export const createCharacterSchema = z.object({
  projectId: z.string().uuid(),
  name: z.string().min(1),
  role: z.enum(['Lead', 'Supporting', 'Background']).optional().default('Supporting'),
  gender: z.string().optional(),
  characterPrompt: z.string().optional(),
  description: z.string().optional(),
  portraitUrl: z.string().url().optional(),
  stress: z.number().min(0).max(100).optional().default(30),
  trust: z.number().min(0).max(100).optional().default(50),
  power: z.number().min(0).max(100).optional().default(30),
  morality: z.number().min(0).max(100).optional().default(50),
  hope: z.number().min(0).max(100).optional().default(60),
  isolation: z.number().min(0).max(100).optional().default(20),
  transformation: z.number().min(0).max(100).optional().default(0),
  mbti: z.string().optional(),
  voiceSignature: z.string().optional(),
})

export const updateCharacterSchema = z.object({
  name: z.string().min(1).optional(),
  role: z.enum(['Lead', 'Supporting', 'Background']).optional(),
  gender: z.string().optional(),
  characterPrompt: z.string().optional(),
  description: z.string().optional(),
  portraitUrl: z.string().url().optional(),
  stress: z.number().min(0).max(100).optional(),
  trust: z.number().min(0).max(100).optional(),
  power: z.number().min(0).max(100).optional(),
  morality: z.number().min(0).max(100).optional(),
  hope: z.number().min(0).max(100).optional(),
  isolation: z.number().min(0).max(100).optional(),
  transformation: z.number().min(0).max(100).optional(),
  mbti: z.string().optional(),
  voiceSignature: z.string().optional(),
  psychology: z.string().optional(),
})

export const listEpisodesSchema = z.object({
  projectId: z.string().uuid(),
})

export const listBeatsSchema = z.object({
  episodeId: z.string().uuid(),
})

export const chatMessageSchema = z.object({
  projectId: z.string().uuid(),
  threadId: z.string().optional(),
  message: z.string().min(1),
  episodeId: z.string().uuid().optional(),
})

// ============================================
// TYPES
// ============================================

export type ListCharactersInput = z.infer<typeof listCharactersSchema>
export type CreateCharacterInput = z.infer<typeof createCharacterSchema>
export type UpdateCharacterInput = z.infer<typeof updateCharacterSchema>
export type ListEpisodesInput = z.infer<typeof listEpisodesSchema>
export type ListBeatsInput = z.infer<typeof listBeatsSchema>
export type ChatMessageInput = z.infer<typeof chatMessageSchema>

export interface ServiceContext {
  userId: string
}

export interface LangSmithContext {
  runName?: string
  tags?: string[]
  metadata?: Record<string, unknown>
}

// ============================================
// SERVICE CLASS
// ============================================

export class StorytellerService {
  /**
   * Verify project access for a user
   */
  async verifyProjectAccess(projectId: string, userId: string): Promise<boolean> {
    const [project] = await db.select().from(projects).where(eq(projects.id, projectId))
    return !!project && project.userId === userId
  }

  /**
   * Verify character access for a user
   */
  async verifyCharacterAccess(characterId: string, userId: string): Promise<boolean> {
    const [character] = await db.select().from(characters).where(eq(characters.id, characterId))
    if (!character) return false

    return this.verifyProjectAccess(character.projectId, userId)
  }

  /**
   * List characters for a project
   */
  async listCharacters(
    input: ListCharactersInput,
    context: ServiceContext
  ): Promise<{ characters: any[] }> {
    const validated = listCharactersSchema.parse(input)

    const hasAccess = await this.verifyProjectAccess(validated.projectId, context.userId)
    if (!hasAccess) {
      throw new ServiceError('Project not found or access denied', 'NOT_FOUND')
    }

    const result = await db
      .select()
      .from(characters)
      .where(eq(characters.projectId, validated.projectId))
      .orderBy(desc(characters.createdAt))

    return { characters: result }
  }

  /**
   * Get a single character by ID
   */
  async getCharacter(characterId: string, context: ServiceContext): Promise<{ character: any }> {
    const [character] = await db.select().from(characters).where(eq(characters.id, characterId))

    if (!character) {
      throw new ServiceError('Character not found', 'NOT_FOUND')
    }

    const hasAccess = await this.verifyProjectAccess(character.projectId, context.userId)
    if (!hasAccess) {
      throw new ServiceError('Character not found or access denied', 'NOT_FOUND')
    }

    return { character }
  }

  /**
   * Create a new character
   */
  async createCharacter(
    input: CreateCharacterInput,
    context: ServiceContext
  ): Promise<{ character: any }> {
    const validated = createCharacterSchema.parse(input)

    const hasAccess = await this.verifyProjectAccess(validated.projectId, context.userId)
    if (!hasAccess) {
      throw new ServiceError('Project not found or access denied', 'NOT_FOUND')
    }

    const [newCharacter] = await db
      .insert(characters)
      .values({
        projectId: validated.projectId,
        name: validated.name,
        role: validated.role,
        gender: validated.gender,
        characterPrompt: validated.characterPrompt,
        description: validated.description,
        portraitUrl: validated.portraitUrl,
        arousal: validated.stress,
        relatedness: validated.trust,
        competence: validated.power,
        moralAlignment: validated.morality,
        valence: validated.hope,
        socialSafety: 100 - validated.isolation,
        transformationProgress: validated.transformation,
        mbti: validated.mbti,
        voiceSignature: validated.voiceSignature,
      })
      .returning()

    return { character: newCharacter }
  }

  /**
   * Update an existing character
   */
  async updateCharacter(
    characterId: string,
    input: UpdateCharacterInput,
    context: ServiceContext
  ): Promise<{ character: any }> {
    const validated = updateCharacterSchema.parse(input)

    const hasAccess = await this.verifyCharacterAccess(characterId, context.userId)
    if (!hasAccess) {
      throw new ServiceError('Character not found or access denied', 'NOT_FOUND')
    }

    const dbUpdates: Record<string, unknown> = {}

    if (validated.name !== undefined) dbUpdates.name = validated.name
    if (validated.role !== undefined) dbUpdates.role = validated.role
    if (validated.gender !== undefined) dbUpdates.gender = validated.gender
    if (validated.characterPrompt !== undefined)
      dbUpdates.characterPrompt = validated.characterPrompt
    if (validated.description !== undefined) dbUpdates.description = validated.description
    if (validated.portraitUrl !== undefined) dbUpdates.portraitUrl = validated.portraitUrl
    if (validated.mbti !== undefined) dbUpdates.mbti = validated.mbti
    if (validated.voiceSignature !== undefined) dbUpdates.voiceSignature = validated.voiceSignature
    if (validated.psychology !== undefined) dbUpdates.psychology = validated.psychology
    if (validated.stress !== undefined) dbUpdates.stressLevel = validated.stress
    if (validated.trust !== undefined) dbUpdates.trustLevel = validated.trust
    if (validated.power !== undefined) dbUpdates.powerLevel = validated.power
    if (validated.morality !== undefined) dbUpdates.moralityLevel = validated.morality
    if (validated.hope !== undefined) dbUpdates.hopeLevel = validated.hope
    if (validated.isolation !== undefined) dbUpdates.isolationLevel = validated.isolation
    if (validated.transformation !== undefined)
      dbUpdates.transformationProgress = validated.transformation

    const [updatedCharacter] = await db
      .update(characters)
      .set({ ...dbUpdates, updatedAt: new Date() })
      .where(eq(characters.id, characterId))
      .returning()

    return { character: updatedCharacter }
  }

  /**
   * Delete a character
   */
  async deleteCharacter(
    characterId: string,
    context: ServiceContext
  ): Promise<{ success: boolean }> {
    const hasAccess = await this.verifyCharacterAccess(characterId, context.userId)
    if (!hasAccess) {
      throw new ServiceError('Character not found or access denied', 'NOT_FOUND')
    }

    await db.delete(characters).where(eq(characters.id, characterId))

    return { success: true }
  }

  /**
   * List episodes for a project
   */
  async listEpisodes(
    input: ListEpisodesInput,
    context: ServiceContext
  ): Promise<{ episodes: any[] }> {
    const validated = listEpisodesSchema.parse(input)

    const hasAccess = await this.verifyProjectAccess(validated.projectId, context.userId)
    if (!hasAccess) {
      throw new ServiceError('Project not found or access denied', 'NOT_FOUND')
    }

    const result = await db
      .select()
      .from(episodes)
      .where(eq(episodes.projectId, validated.projectId))
      .orderBy(desc(episodes.createdAt))

    return { episodes: result }
  }

  /**
   * List beats for an episode
   */
  async listBeats(input: ListBeatsInput, context: ServiceContext): Promise<{ beats: any[] }> {
    const validated = listBeatsSchema.parse(input)

    // Get episode to verify access
    const [episode] = await db.select().from(episodes).where(eq(episodes.id, validated.episodeId))
    if (!episode) {
      throw new ServiceError('Episode not found', 'NOT_FOUND')
    }

    const hasAccess = await this.verifyProjectAccess(episode.projectId, context.userId)
    if (!hasAccess) {
      throw new ServiceError('Episode not found or access denied', 'NOT_FOUND')
    }

    const result = await db
      .select()
      .from(beats)
      .where(eq(beats.episodeId, validated.episodeId))
      .orderBy(beats.sequence)

    return { beats: result }
  }

  /**
   * Get the series bible for a project
   */
  async getSeriesBible(projectId: string, context: ServiceContext): Promise<{ seriesBible: any }> {
    const hasAccess = await this.verifyProjectAccess(projectId, context.userId)
    if (!hasAccess) {
      throw new ServiceError('Project not found or access denied', 'NOT_FOUND')
    }

    const [project] = await db.select().from(projects).where(eq(projects.id, projectId))

    return { seriesBible: project?.seriesBible || {} }
  }

  /**
   * Send a message to the writers room and get a response
   * This invokes the LangGraph workflow
   */
  async chat(
    input: ChatMessageInput,
    context: ServiceContext,
    langsmithContext?: LangSmithContext
  ): Promise<{ response: any; threadId: string }> {
    const validated = chatMessageSchema.parse(input)

    const hasAccess = await this.verifyProjectAccess(validated.projectId, context.userId)
    if (!hasAccess) {
      throw new ServiceError('Project not found or access denied', 'NOT_FOUND')
    }

    // TODO P1-10: Replace WritersRoomGraph with beat-draft-workflow
    // Import the graph dynamically to avoid circular dependencies
    const { getWritersRoomGraph } = await import(
      '@/domains/storyteller/agents/orchestration/WritersRoomGraph'
    )
    const graph = await getWritersRoomGraph()

    // Generate thread ID if not provided
    const threadId =
      validated.threadId || `thread_${Date.now()}_${Math.random().toString(36).slice(2)}`

    // Get series bible and characters for context
    const { seriesBible } = await this.getSeriesBible(validated.projectId, context)
    const { characters: projectCharacters } = await this.listCharacters(
      { projectId: validated.projectId },
      context
    )

    // Invoke the graph (legacy pattern - P1-10 will rewire)
    const result = await graph.invoke({
      messages: [{ role: 'user', content: validated.message }],
      projectId: validated.projectId,
      episodeId: validated.episodeId,
      seriesBible,
      characters: projectCharacters,
      beatBoard: [],
      rejectedBeats: [],
      unresolvedSetups: [],
      currentPhase: 'premise',
      // LangSmith config embedded for legacy compatibility
      runName: langsmithContext?.runName || 'storyteller_chat',
      tags: langsmithContext?.tags || ['storyteller', 'chat'],
      metadata: {
        ...langsmithContext?.metadata,
        projectId: validated.projectId,
        threadId,
        userId: context.userId,
      },
      configurable: {
        thread_id: threadId,
      },
    } as WritersRoomState)

    return { response: result, threadId }
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
// SINGLETON EXPORT
// ============================================

export const storytellerService = new StorytellerService()
