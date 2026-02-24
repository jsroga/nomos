/**
 * Character Creation Tools - Mastra v2
 *
 * Tools for creating and managing cast members with interactive question flow
 */

import { createTool } from '@mastra/core/tools'
import { z } from 'zod'

// ==========================================
// SCHEMAS
// ==========================================

const CreateCharacterInputSchema = z.object({
  projectId: z.string().describe('Project ID where character will be created'),
  name: z.string().describe('Character name'),
  role: z.string().describe('Character role: Protagonist, Antagonist, Supporting, etc.'),
  description: z.string().optional().describe('Physical/personality description'),
  shortDescription: z.string().optional().describe('Brief one-line description'),
  gender: z.string().describe('Character gender'),
  archetype: z.string().optional().describe('Character archetype (e.g., Mentor, Hero, Trickster)'),
  motivation: z.string().optional().describe('Core motivation'),
  fatalFlaw: z.string().optional().describe('Fatal flaw or weakness'),
  traits: z.array(z.string()).optional().describe('Key personality traits'),
  mbti: z.string().describe('MBTI personality type'),
  voiceSignature: z.string().optional().describe('How they speak/communicate'),
})

const AskCharacterQuestionsInputSchema = z.object({
  projectId: z.string().describe('Project ID'),
  characterName: z.string().describe('Name of character being created'),
  questions: z
    .array(
      z.object({
        id: z.string().describe('Unique question ID (e.g., "motivation", "flaw")'),
        question: z.string().describe('The question to ask the user'),
        required: z.boolean().optional().describe('Is this question required?'),
      })
    )
    .describe('Questions to ask the user'),
})

// ==========================================
// TOOLS
// ==========================================

/**
 * Ask user questions about a character before creating it
 * Enables interactive character creation with guided questions
 */
export const askCharacterQuestionsTool = createTool({
  id: 'ask_character_questions',
  description:
    "Ask the user a series of questions to gather information for character creation. Use this when the user wants to create a character but hasn't provided all details.",
  inputSchema: AskCharacterQuestionsInputSchema,
  execute: async (args: any) => {
    const context = args?.context || args
    const { characterName, questions } = context

    // Return questions in a format that the UI can display
    return JSON.stringify({
      success: true,
      type: 'questions',
      characterName,
      questions: questions.map((q: any) => ({
        id: q.id,
        question: q.question,
        required: q.required ?? true,
      })),
      message: `I have ${questions.length} questions about ${characterName} to help create a compelling character profile.`,
    })
  },
})

/**
 * Create a character in the cast
 * Call this after gathering information (either directly or via questions)
 */
export const createCharacterTool = createTool({
  id: 'create_character',
  description:
    'Create a new character in the project cast. Use this after gathering character details from the user.',
  inputSchema: CreateCharacterInputSchema,
  execute: async (args: any) => {
    const context = args?.context || args
    const {
      projectId,
      name,
      role,
      description,
      shortDescription,
      gender,
      archetype,
      motivation,
      fatalFlaw,
      traits,
      mbti,
      voiceSignature,
    } = context

    if (!projectId || !name || !role) {
      return JSON.stringify({
        success: false,
        error: 'projectId, name, and role are required to create a character',
      })
    }

    try {
      // Call the character creation API
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/api/storyteller/characters`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-bypass-auth': 'true',
          },
          body: JSON.stringify({
            projectId,
            name,
            role,
            description: description || shortDescription || '',
            shortDescription: shortDescription || description?.slice(0, 100) || '',
            gender,
            psychology: {
              archetype,
              motivation,
              fatalFlaw,
              traits,
            },
            mbti,
            voiceSignature,
            // Default metrics
            valence: 0,
            arousal: 50,
            autonomy: 60,
            competence: 60,
            relatedness: 50,
            cognitiveClarity: 70,
            perceivedStakes: 40,
            socialSafety: 60,
            moralAlignment: 70,
            transformationProgress: 0,
          }),
        }
      )

      if (!response.ok) {
        const error = await response.json()
        return JSON.stringify({
          success: false,
          error: error.error || 'Failed to create character',
        })
      }

      const character = await response.json()

      return JSON.stringify({
        success: true,
        character: {
          id: character.id,
          name: character.name,
          role: character.role,
        },
        message: `Created ${name} (${role}) successfully!`,
      })
    } catch (error) {
      return JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      })
    }
  },
})

/**
 * Check if a character exists in the cast
 */
export const checkCharacterExistsTool = createTool({
  id: 'check_character_exists',
  description: 'Check if a character with a given name already exists in the project cast',
  inputSchema: z.object({
    projectId: z.string(),
    characterName: z.string(),
  }),
  execute: async (args: any) => {
    const context = args?.context || args
    const { projectId, characterName } = context

    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/api/storyteller/characters?projectId=${projectId}`,
        {
          headers: {
            'x-bypass-auth': 'true',
          },
        }
      )

      if (!response.ok) {
        return JSON.stringify({ success: false, exists: false })
      }

      const characters = await response.json()
      const exists = characters.some(
        (c: any) => c.name.toLowerCase() === characterName.toLowerCase()
      )

      return JSON.stringify({
        success: true,
        exists,
        character: exists
          ? characters.find((c: any) => c.name.toLowerCase() === characterName.toLowerCase())
          : null,
      })
    } catch (error) {
      return JSON.stringify({
        success: false,
        exists: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      })
    }
  },
})

// ==========================================
// EXPORTS
// ==========================================

export const characterCreationTools = [
  askCharacterQuestionsTool,
  createCharacterTool,
  checkCharacterExistsTool,
]
