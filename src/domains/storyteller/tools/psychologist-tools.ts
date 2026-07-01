import { createTool } from '@mastra/core/tools'
import { z } from 'zod'

/**
 * Analyze Character Psychology Tool
 *
 * Derives deep psychological metrics (Big 5, Needs, Wants) from a character description
 * or existing profile.
 */
export const analyzePsychologyTool = createTool({
  id: 'analyze-psychology',
  description:
    'Analyze character psychology to determine Big 5 traits, core needs, and false beliefs.',
  inputSchema: z.object({
    name: z.string(),
    description: z.string(),
    role: z.string().optional(),
    context: z.string().optional().describe('Additional context about the story or world'),
  }),
  outputSchema: z.object({
    psychometrics: z.object({
      openness: z.number().describe('0-1 scale'),
      conscientiousness: z.number().describe('0-1 scale'),
      extraversion: z.number().describe('0-1 scale'),
      agreeableness: z.number().describe('0-1 scale'),
      neuroticism: z.number().describe('0-1 scale'),
    }),
    needs: z.object({
      primary: z.string().describe('Main psychological drive'),
      secondary: z.string().describe('Secondary drive'),
      deficiency: z.string().describe('The "Hole in the Soul"'),
      falseBelief: z.string().describe('The lie they believe about themselves'),
    }),
    analysis: z.string().describe('Qualitative analysis of the character psyche'),
  }),
  execute: async (args: any) => {
    const context = args?.context || args
    // This tool is primarily used by the LLM itself to structure its thinking,
    // but in a real system this might query a psychological vector DB.
    // For now, it returns a structured placeholder that the Agent fills.
    return {
      psychometrics: {
        openness: 0.5,
        conscientiousness: 0.5,
        extraversion: 0.5,
        agreeableness: 0.5,
        neuroticism: 0.5,
      },
      needs: {
        primary: 'To be understood',
        secondary: 'Safety',
        deficiency: 'Lack of self-worth',
        falseBelief: 'I am only valuable when I am useful',
      },
      analysis: `Psychological analysis of ${context.name} based on description.`,
    }
  },
})

/**
 * Simulate Reaction Tool
 *
 * Simulates how a specific character would react to a given event or beat.
 */
export const simulateReactionTool = createTool({
  id: 'simulate-reaction',
  description: 'Simulate how a character reacts to a specific event based on their psychology.',
  inputSchema: z.object({
    characterName: z.string(),
    psychProfile: z
      .object({
        traits: z.record(z.number()).optional(),
        needs: z.record(z.string()).optional(),
      })
      .optional(),
    event: z.string().describe('The event or beat happening'),
    context: z.string().optional(),
  }),
  outputSchema: z.object({
    reaction: z.string().describe('Emotional and behavioral reaction'),
    dialogue: z.string().optional().describe('Potential dialogue line'),
    emotionalShift: z.object({
      from: z.string(),
      to: z.string(),
      intensity: z.number().describe('1-10'),
    }),
  }),
  execute: async (args: any) => {
    const context = args?.context || args
    return {
      reaction: `${context.characterName} reacts to "${context.event}"`,
      emotionalShift: {
        from: 'Neutral',
        to: 'Reacting',
        intensity: 5,
      },
    }
  },
})

/**
 * Assess Relationship Tool
 *
 * Evaluates the dynamic between two characters.
 */
export const assessRelationshipTool = createTool({
  id: 'assess-relationship',
  description: 'Evaluate the dynamic, trust, and conflict level between two characters.',
  inputSchema: z.object({
    charA: z.string(),
    charB: z.string(),
    history: z.array(z.string()).optional(),
  }),
  outputSchema: z.object({
    trust: z.number().describe('0-100'),
    conflict: z.number().describe('0-100'),
    dynamic: z.string().describe('Description of their interplay'),
    subtext: z.string().describe('What is left unsaid'),
  }),
  execute: async (args: any) => {
    const context = args?.context || args
    return {
      trust: 50,
      conflict: 20,
      dynamic: `Relationship between ${context.charA} and ${context.charB}`,
      subtext: 'Hidden tensions or potential alliance.',
    }
  },
})
