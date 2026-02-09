/**
 * Episode Creation Tools - Mastra v2
 *
 * Tools for creating episodes with premise generation, poster creation, and beat planning
 */

import { createTool } from '@mastra/core/tools'
import { z } from 'zod'

// ==========================================
// SCHEMAS
// ==========================================

const CreateEpisodeInputSchema = z.object({
  projectId: z.string().describe('Project ID where episode will be created'),
  sequence: z.number().describe('Episode number in the series (1-based)'),
  title: z.string().describe('Episode title'),
  thematicFocus: z.string().optional().describe('Central theme of this episode'),
  premise: z
    .object({
      logline: z.string().describe('One-sentence episode summary'),
      protagonistHook: z.string().describe('What pulls the protagonist into this episode'),
      antagonistMove: z.string().describe('What the antagonist does to create conflict'),
      fatalFlaw: z.string().describe("How protagonist's flaw creates problems"),
      thematicQuestion: z.string().describe('The central question this episode explores'),
    })
    .optional()
    .describe('Episode premise structure'),
  generatePoster: z.boolean().optional().describe('Whether to generate a poster for this episode'),
})

const AskContinueToBeatsInputSchema = z.object({
  episodeId: z.string().describe('The episode ID that was just created'),
  episodeTitle: z.string().describe('The episode title for context'),
})

// ==========================================
// TOOLS
// ==========================================

/**
 * Create a new episode with premise
 * Generates full episode structure including premise and optionally poster
 */
export const createEpisodeTool = createTool({
  id: 'create_episode',
  description:
    'Create a new episode in the series with full premise structure. Optionally generate poster art.',
  inputSchema: CreateEpisodeInputSchema,
  execute: async (args: any) => {
    const context = args?.context || args
    const { projectId, sequence, title, thematicFocus, premise, generatePoster = true } = context

    if (!projectId || !title) {
      return JSON.stringify({
        success: false,
        error: 'projectId and title are required to create an episode',
      })
    }

    try {
      // Create episode via API
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/api/storyteller/episodes`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-bypass-auth': 'system',
          },
          body: JSON.stringify({
            projectId,
            sequence: sequence || 1,
            title,
            thematicFocus,
            premise: premise ? JSON.stringify(premise) : null,
            storyPlan: premise ? { premise } : null,
          }),
        }
      )

      if (!response.ok) {
        const error = await response.json()
        return JSON.stringify({
          success: false,
          error: error.error || 'Failed to create episode',
        })
      }

      const episode = await response.json()

      // Optionally generate poster (trigger async, don't wait)
      if (generatePoster && premise?.logline) {
        // Fire and forget poster generation
        fetch(
          `${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/api/storyteller/moodboard/trigger`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'x-bypass-auth': 'system',
            },
            body: JSON.stringify({
              projectId,
              episodeId: episode.id,
              type: 'poster',
              prompt: `${premise.logline}. ${premise.protagonistHook}.`,
            }),
          }
        ).catch(() => {
          console.warn('[Episode Creation] Poster generation failed (non-blocking)')
        })
      }

      return JSON.stringify({
        success: true,
        episode: {
          id: episode.id,
          title: episode.title,
          sequence: episode.sequence,
        },
        message: `Created Episode ${sequence}: "${title}"${generatePoster ? ' (poster generating...)' : ''}`,
        nextStep: 'ask_continue_to_beats',
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
 * Ask user if they want to continue to beat planning
 * Called after episode creation succeeds
 */
export const askContinueTobeatsTool = createTool({
  id: 'ask_continue_to_beats',
  description:
    'Ask the user if they want to continue to beat planning for the newly created episode',
  inputSchema: AskContinueToBeatsInputSchema,
  execute: async (args: any) => {
    const context = args?.context || args
    const { episodeId, episodeTitle } = context

    return JSON.stringify({
      success: true,
      type: 'questions',
      questions: [
        {
          id: 'continue_to_beats',
          question: `Episode "${episodeTitle}" is ready! Would you like to start planning the beats (story structure) now, or save this for later?`,
          options: [
            { id: 'yes', label: 'Yes, plan the beats', recommended: true },
            { id: 'later', label: 'Save for later' },
          ],
        },
      ],
      context: {
        episodeId,
        episodeTitle,
        nextAction: 'beat_planning',
      },
    })
  },
})

/**
 * Start beat planning for an episode
 * Called after user confirms they want to proceed with beat breakdown
 */
export const startBeatPlanningTool = createTool({
  id: 'start_beat_planning',
  description: 'Begin the beat planning process for an episode (breaking story into sequences)',
  inputSchema: z.object({
    episodeId: z.string().describe('Episode ID to plan beats for'),
    projectId: z.string().describe('Project ID'),
  }),
  execute: async (args: any) => {
    const context = args?.context || args
    const { episodeId, projectId } = context

    // This returns a signal that the UI should navigate to beat board
    return JSON.stringify({
      success: true,
      type: 'navigation',
      action: 'open_beat_board',
      episodeId,
      message: 'Opening beat board for story planning...',
    })
  },
})

// ==========================================
// EXPORTS
// ==========================================

export const episodeCreationTools = [
  createEpisodeTool,
  askContinueTobeatsTool,
  startBeatPlanningTool,
]
