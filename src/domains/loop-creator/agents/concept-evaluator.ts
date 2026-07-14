/**
 * Concept Evaluator Agent
 *
 * Uses LangChain to automatically evaluate whether generated mechanics
 * match the user's requested game concept.
 */

import { ChatOpenAI } from '@langchain/openai'
import { z } from 'zod'
import { LoopCreatorState } from '../core/graph/state'

const ConceptEvaluationSchema = z.object({
  overallAlignment: z.number().min(0).max(100).describe('Overall alignment score 0-100'),
  conceptMatch: z
    .object({
      score: z.number().min(0).max(100),
      reasoning: z.string(),
      matchedElements: z
        .array(z.string())
        .nullable()
        .optional()
        .describe('Elements that match the concept'),
      missingElements: z
        .array(z.string())
        .nullable()
        .optional()
        .describe('Expected elements that are missing'),
    })
    .nullable()
    .optional(),
  genreAccuracy: z
    .object({
      score: z.number().min(0).max(100),
      detectedGenre: z.string(),
      expectedGenre: z.string(),
      reasoning: z.string(),
    })
    .nullable()
    .optional(),
  mechanicsRelevance: z
    .array(
      z.object({
        mechanicName: z.string(),
        relevanceScore: z.number().min(0).max(100),
        reasoning: z.string(),
      })
    )
    .nullable()
    .optional(),
  suggestions: z
    .array(
      z.object({
        type: z.enum(['add', 'modify', 'remove']),
        description: z.string(),
        priority: z.enum(['high', 'medium', 'low']),
      })
    )
    .nullable()
    .optional(),
  summary: z.string().describe('Brief summary of evaluation'),
})

type ConceptEvaluation = z.infer<typeof ConceptEvaluationSchema>

const CONCEPT_EVALUATOR_PROMPT = `You are a game design concept alignment evaluator.

Your task is to evaluate whether the generated game mechanics ACTUALLY match the user's requested game concept.

## User's Requested Concept
Game Description: {{GAME_DESCRIPTION}}
Reference Games: {{REFERENCE_GAMES}}
Genre: {{GENRE}}

## Generated Mechanics
{{MECHANICS}}

## Evaluation Criteria

1. **Concept Match (40%)**: Do the mechanics capture the ESSENCE of the requested game?
   - If they asked for "Disco Elysium", are there dialogue systems, skill checks, narrative branches?
   - If they asked for "Vampire Survivors", are there auto-attack, hordes, power progression?

2. **Genre Accuracy (30%)**: Do the mechanics fit the expected genre?
   - Narrative RPG should have dialogue, choices, character stats
   - Action roguelike should have combat, randomization, power-ups
   - Competitive shooter should have precision, team play, economy

3. **Mechanics Relevance (30%)**: Is each mechanic actually relevant to the concept?
   - Generic mechanics that could be in any game score lower
   - Mechanics that capture the unique feel of the reference score higher

## Scoring Guide
- 90-100: Excellent alignment, captures the essence perfectly
- 70-89: Good alignment, most key elements present
- 50-69: Partial alignment, missing some key elements
- 30-49: Poor alignment, only superficial similarities
- 0-29: No alignment, wrong genre/concept entirely

Be HONEST and CRITICAL. If someone asks for "Disco Elysium" and gets generic RPG mechanics without the unique internal monologue system, that's a LOW score.

Respond with a JSON object matching the evaluation schema.`

/**
 * Extract reference game name from user description
 */
function extractReferenceGame(description: string): string {
  const knownGames = [
    'Disco Elysium',
    'Vampire Survivors',
    'Counter-Strike',
    'Hades',
    'Slay the Spire',
    'Dark Souls',
    'Hollow Knight',
    'Stardew Valley',
    'Animal Crossing',
    'Celeste',
    'Undertale',
    'Baldur\'s Gate',
    'Mass Effect',
    'The Witcher',
  ]

  const lowerDesc = description.toLowerCase()
  for (const game of knownGames) {
    if (lowerDesc.includes(game.toLowerCase())) {
      return game
    }
  }

  return 'Unknown'
}

/**
 * Format mechanics for evaluation
 */
function formatMechanics(state: LoopCreatorState): string {
  if (state.mechanics.length === 0) {
    return 'No mechanics generated yet.'
  }

  return state.mechanics
    .map(m => {
      return `- **${m.name}** (${m.type}): ${m.description || 'No description'}`
    })
    .join('\n')
}

/**
 * Evaluate concept alignment
 */
export async function evaluateConceptAlignment(
  state: LoopCreatorState
): Promise<ConceptEvaluation> {
  const model = new ChatOpenAI({
    modelName: state.modelConfig?.model || 'gpt-4o',
    temperature: 0.2, // Lower temperature for more consistent evaluation
  })

  const referenceGame = extractReferenceGame(state.gameDescription || '')

  const prompt = CONCEPT_EVALUATOR_PROMPT.replace(
    '{{GAME_DESCRIPTION}}',
    state.gameDescription || 'No description provided'
  )
    .replace('{{REFERENCE_GAMES}}', referenceGame)
    .replace('{{GENRE}}', state.gameGenre || 'Unknown')
    .replace('{{MECHANICS}}', formatMechanics(state))

  const response = await model.invoke([
    { role: 'system', content: prompt },
    { role: 'user', content: 'Evaluate the concept alignment and provide your assessment.' },
  ])

  const content =
    typeof response.content === 'string' ? response.content : JSON.stringify(response.content)

  // Parse JSON from response
  const jsonMatch = content.match(/\{[\s\S]*\}/)
  if (jsonMatch) {
    try {
      const parsed = JSON.parse(jsonMatch[0])
      return ConceptEvaluationSchema.parse(parsed)
    } catch (error) {
      console.error('[ConceptEvaluator] Parse error:', error)
    }
  }

  // Return default low score if parsing fails
  return {
    overallAlignment: 0,
    conceptMatch: null,
    genreAccuracy: null,
    mechanicsRelevance: null,
    suggestions: null,
    summary: 'Evaluation failed - unable to parse response',
  }
}
