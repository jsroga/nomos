/**
 * Legacy writers'-room council tools — kept for council agents until GRRM workflow migration.
 * GRRM chat uses grrmTools only; these satisfy council Agent tool maps and compile cleanly.
 */

import { createTool } from '@mastra/core/tools'
import { z } from 'zod'

const proseInputSchema = z.object({
  text: z.string().describe('Prose or dialogue to analyze or revise'),
  instruction: z.string().optional().describe('Optional focus for the revision'),
  sceneContext: z.string().optional(),
})

const proseOutputSchema = z.object({
  success: z.boolean(),
  result: z.string(),
  notes: z.string().optional(),
})

function createProseCouncilTool(id: string, description: string) {
  return createTool({
    id,
    description,
    inputSchema: proseInputSchema,
    outputSchema: proseOutputSchema,
    execute: async (inputData) => ({
      success: true,
      result: inputData.text,
      notes: 'Council prose tool (legacy) — full rewrite path moves to GRRM workflow',
    }),
  })
}

export const selfCritiqueTool = createProseCouncilTool(
  'self_critique',
  'Structured self-critique pass on draft prose',
)

export const improveDialogueTool = createProseCouncilTool(
  'improve_dialogue',
  'Tighten dialogue for subtext and voice',
)

export const addVisualHookTool = createProseCouncilTool(
  'add_visual_hook',
  'Suggest a visual or sensory hook for the scene',
)

export const condenseSceneTool = createProseCouncilTool(
  'condense_scene',
  'Condense scene prose while preserving beats',
)

export const regenerateTextTool = createProseCouncilTool(
  'regenerate_text',
  'Regenerate a passage with alternate wording',
)

export const shiftToneTool = createProseCouncilTool(
  'shift_tone',
  'Adjust tone while preserving plot beats',
)

const psychologyInputSchema = z.object({
  characterName: z.string(),
  situation: z.string().optional(),
  relationship: z.string().optional(),
  text: z.string().optional(),
})

const psychologyOutputSchema = z.object({
  success: z.boolean(),
  analysis: z.string(),
  recommendations: z.array(z.string()).optional(),
})

function createPsychologyTool(id: string, description: string) {
  return createTool({
    id,
    description,
    inputSchema: psychologyInputSchema,
    outputSchema: psychologyOutputSchema,
    execute: async (inputData) => ({
      success: true,
      analysis: `Psychology pass for ${inputData.characterName} (legacy council tool).`,
      recommendations: [],
    }),
  })
}

export const analyzePsychologyTool = createPsychologyTool(
  'analyze_psychology',
  'Analyze character motivation and internal conflict',
)

export const simulateReactionTool = createPsychologyTool(
  'simulate_reaction',
  'Simulate how a character would react in a situation',
)

export const assessRelationshipTool = createPsychologyTool(
  'assess_relationship',
  'Assess relationship dynamics between characters',
)

const quickCheckInputSchema = z.object({
  projectId: z.string().uuid(),
  episodeId: z.string().uuid().optional(),
  beatIds: z.array(z.string().uuid()).optional(),
})

const quickCheckOutputSchema = z.object({
  success: z.boolean(),
  message: z.string(),
  issues: z.array(z.unknown()).optional(),
})

export const quickConsistencyCheckTool = createTool({
  id: 'quick_consistency_check',
  description: 'Fast continuity scan for council consequence passes',
  inputSchema: quickCheckInputSchema,
  outputSchema: quickCheckOutputSchema,
  execute: async (inputData) => {
    try {
      const { ConsistencyService } = await import(
        '@/domains/storyteller/services/ConsistencyService'
      )

      const result = await ConsistencyService.runConsistencyCheck({
        projectId: inputData.projectId,
        episodeId: inputData.episodeId,
        beatIds: inputData.beatIds,
        checkTypes: ['world_rules', 'character_knowledge', 'timeline'],
      })

      if (!result.ok) {
        return { success: false, message: result.error, issues: [] }
      }

      const { issues, summary } = result.value
      return {
        success: issues.length === 0,
        message: summary,
        issues,
      }
    } catch (error) {
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Quick consistency check failed',
        issues: [],
      }
    }
  },
})
