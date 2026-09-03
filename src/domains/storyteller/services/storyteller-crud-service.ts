import 'server-only'

/**
 * Storyteller Service
 *
 * Shared business logic for storyteller domain operations.
 * Used by both REST API and MCP server.
 */

import { memoryRef } from '@/shared/agent-kernel/mastra/memory-ref'
import { db } from '@/db/client'
import { characters, projects, episodes, beats } from '@/db/schema'
import { eq, desc } from 'drizzle-orm'
import {
  ProjectForbidden,
  projectScope,
  tryProjectScope,
  type ProjectScope,
} from '@/shared/auth/project-scope'

type CharacterRow = typeof characters.$inferSelect
type EpisodeRow = typeof episodes.$inferSelect
type BeatRow = typeof beats.$inferSelect
import { z } from 'zod'
import {
  STORYTELLER_CHARACTER_ROLE_VALUES,
  STORYTELLER_CRUD_ACCESS_ERRORS,
  StorytellerChatRole,
  StorytellerCrudAgentPrompt,
  StorytellerCrudErrorCode,
  StorytellerCrudErrorMessage,
  StorytellerCrudErrorName,
  StorytellerCrudListSeparator,
  StorytellerCharacterRole,
} from '@/domains/storyteller/services/constants/storyteller-crud-service'
import { buildCharacterDbUpdates } from '@/domains/storyteller/services/character-update-fields'
import {
  updateCharacterSchema,
  type UpdateCharacterInput,
} from '@/domains/storyteller/services/storyteller-character-schema'

// ============================================
// SCHEMAS
// ============================================

export const listCharactersSchema = z.object({
  projectId: z.string().uuid(),
})

export const createCharacterSchema = z.object({
  projectId: z.string().uuid(),
  name: z.string().min(1),
  role: z
    .enum(STORYTELLER_CHARACTER_ROLE_VALUES)
    .optional()
    .default(StorytellerCharacterRole.Supporting),
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
export type { UpdateCharacterInput } from '@/domains/storyteller/services/storyteller-character-schema'
export { updateCharacterSchema } from '@/domains/storyteller/services/storyteller-character-schema'
export type ListEpisodesInput = z.infer<typeof listEpisodesSchema>
export type ListBeatsInput = z.infer<typeof listBeatsSchema>
export type ChatMessageInput = z.infer<typeof chatMessageSchema>

export interface ServiceContext {
  userId: string
}

// ============================================
// SERVICE CLASS
// ============================================

export class StorytellerService {
  /** Private: outside this class, access is established by `projectScope()`. */
  private async hasProjectAccess(projectId: string, userId: string): Promise<boolean> {
    return Boolean(await tryProjectScope(projectId, userId))
  }

  /** Reports refusal as this service's `NotFound`, the shape MCP already handles. */
  private async requireScope(projectId: string, userId: string): Promise<ProjectScope> {
    try {
      return await projectScope(projectId, userId)
    } catch (error) {
      if (error instanceof ProjectForbidden) {
        throw new ServiceError(
          STORYTELLER_CRUD_ACCESS_ERRORS.project,
          StorytellerCrudErrorCode.NotFound
        )
      }
      throw error
    }
  }

  /**
   * Verify character access for a user
   */
  private async verifyCharacterAccess(characterId: string, userId: string): Promise<boolean> {
    const [character] = await db.select().from(characters).where(eq(characters.id, characterId))
    if (!character) return false

    return this.hasProjectAccess(character.projectId, userId)
  }

  /**
   * List characters for a project
   */
  async listCharacters(
    input: ListCharactersInput,
    context: ServiceContext
  ): Promise<{ characters: CharacterRow[] }> {
    const validated = listCharactersSchema.parse(input)

    const hasAccess = await this.hasProjectAccess(validated.projectId, context.userId)
    if (!hasAccess) {
      throw new ServiceError(
        STORYTELLER_CRUD_ACCESS_ERRORS.project,
        StorytellerCrudErrorCode.NotFound
      )
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
  async getCharacter(
    characterId: string,
    context: ServiceContext
  ): Promise<{ character: CharacterRow }> {
    const [character] = await db.select().from(characters).where(eq(characters.id, characterId))

    if (!character) {
      throw new ServiceError(
        StorytellerCrudErrorMessage.CharacterNotFound,
        StorytellerCrudErrorCode.NotFound
      )
    }

    const hasAccess = await this.hasProjectAccess(character.projectId, context.userId)
    if (!hasAccess) {
      throw new ServiceError(
        STORYTELLER_CRUD_ACCESS_ERRORS.character,
        StorytellerCrudErrorCode.NotFound
      )
    }

    return { character }
  }

  /**
   * Create a new character
   */
  async createCharacter(
    input: CreateCharacterInput,
    context: ServiceContext
  ): Promise<{ character: CharacterRow }> {
    const validated = createCharacterSchema.parse(input)

    const hasAccess = await this.hasProjectAccess(validated.projectId, context.userId)
    if (!hasAccess) {
      throw new ServiceError(
        STORYTELLER_CRUD_ACCESS_ERRORS.project,
        StorytellerCrudErrorCode.NotFound
      )
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
  ): Promise<{ character: CharacterRow }> {
    const validated = updateCharacterSchema.parse(input)

    const hasAccess = await this.verifyCharacterAccess(characterId, context.userId)
    if (!hasAccess) {
      throw new ServiceError(
        STORYTELLER_CRUD_ACCESS_ERRORS.character,
        StorytellerCrudErrorCode.NotFound
      )
    }

    const dbUpdates = buildCharacterDbUpdates(validated)

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
      throw new ServiceError(
        STORYTELLER_CRUD_ACCESS_ERRORS.character,
        StorytellerCrudErrorCode.NotFound
      )
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
  ): Promise<{ episodes: EpisodeRow[] }> {
    const validated = listEpisodesSchema.parse(input)

    const hasAccess = await this.hasProjectAccess(validated.projectId, context.userId)
    if (!hasAccess) {
      throw new ServiceError(
        STORYTELLER_CRUD_ACCESS_ERRORS.project,
        StorytellerCrudErrorCode.NotFound
      )
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
  async listBeats(input: ListBeatsInput, context: ServiceContext): Promise<{ beats: BeatRow[] }> {
    const validated = listBeatsSchema.parse(input)

    // Get episode to verify access
    const [episode] = await db.select().from(episodes).where(eq(episodes.id, validated.episodeId))
    if (!episode) {
      throw new ServiceError(
        STORYTELLER_CRUD_ACCESS_ERRORS.episode,
        StorytellerCrudErrorCode.NotFound
      )
    }

    const hasAccess = await this.hasProjectAccess(episode.projectId, context.userId)
    if (!hasAccess) {
      throw new ServiceError(
        STORYTELLER_CRUD_ACCESS_ERRORS.episodeAccess,
        StorytellerCrudErrorCode.NotFound
      )
    }

    const result = await db
      .select()
      .from(beats)
      .where(eq(beats.episodeId, validated.episodeId))
      .orderBy(beats.sequence)

    return { beats: result }
  }

  /** Takes a scope: ownership was proved to mint it, so there is no second check. */
  async getSeriesBible(scope: ProjectScope): Promise<{ seriesBible: unknown }> {
    const [project] = await db.select().from(projects).where(eq(projects.id, scope.projectId))

    return { seriesBible: project?.seriesBible || {} }
  }

  /**
   * Send a message to the storyteller chat adapter and get a response.
   * (Response shape kept from the legacy writers'-room graph for MCP callers:
   * `{ response: { messages: [{ role: 'assistant', content }] }, threadId }`.)
   */
  async chat(
    input: ChatMessageInput,
    context: ServiceContext,
  ): Promise<{
    response: { messages: Array<{ role: 'assistant'; content: string }> }
    threadId: string
  }> {
    const validated = chatMessageSchema.parse(input)

    const scope = await this.requireScope(validated.projectId, context.userId)

    // Dynamic import to avoid a static service ↔ agents cycle.
    const { createStorytellerAgent } = await import(
      '@/domains/storyteller/ai/agents/StorytellerAgent/storyteller-agent'
    )
    const agent = await createStorytellerAgent()

    // Generate thread ID if not provided
    const threadId =
      validated.threadId ||
      memoryRef({
        projectId: validated.projectId,
        episodeId: validated.episodeId,
        userId: context.userId,
      }).thread

    // Get series bible and characters for context
    const { seriesBible } = await this.getSeriesBible(scope)
    const { characters: projectCharacters } = await this.listCharacters(
      { projectId: validated.projectId },
      context
    )

    const chatContext = [
      `Project: ${validated.projectId}`,
      validated.episodeId ? `Episode: ${validated.episodeId}` : '',
      `Bible: ${JSON.stringify(seriesBible)}`,
      `Characters: ${projectCharacters.map(c => c.name).join(StorytellerCrudListSeparator.CommaSpace)}`,
    ]
      .filter(Boolean)
      .join('\n')

    const content = await agent.run(
      StorytellerCrudAgentPrompt.RespondToUser,
      `${chatContext}\n\nUser: ${validated.message}`
    )

    return {
      response: { messages: [{ role: StorytellerChatRole.Assistant, content }] },
      threadId,
    }
  }
}

// ============================================
// ERROR HANDLING
// ============================================

export type ServiceErrorCode =
  | `${StorytellerCrudErrorCode.NotFound}`
  | `${StorytellerCrudErrorCode.Unauthorized}`
  | `${StorytellerCrudErrorCode.ValidationError}`
  | `${StorytellerCrudErrorCode.InternalError}`
  | `${StorytellerCrudErrorCode.RateLimited}`

export class ServiceError extends Error {
  constructor(
    message: string,
    public code: ServiceErrorCode,
    public details?: unknown
  ) {
    super(message)
    this.name = StorytellerCrudErrorName.ServiceError
  }
}

// ============================================
// SINGLETON EXPORT
// ============================================

export const storytellerService = new StorytellerService()
