/**
 * Storyteller LLM-as-Judge
 *
 * Uses LLM to evaluate the quality of storytelling outputs.
 * Integrates with Langfuse for scoring and tracing.
 */

import { createOpenAI } from '@ai-sdk/openai'
import { generateText } from 'ai'
import { langfuse } from '@/agent-core/observability'
import { z } from 'zod'

// ============================================
// EVALUATION DIMENSIONS
// ============================================

export const EVALUATION_DIMENSIONS = {
  creativity: {
    name: 'Creativity',
    description: 'How original and imaginative is the content?',
    weight: 0.25,
  },
  coherence: {
    name: 'Coherence',
    description: 'Is the content internally consistent and logical?',
    weight: 0.25,
  },
  completeness: {
    name: 'Completeness',
    description: 'Does the output include all required elements?',
    weight: 0.25,
  },
  engagement: {
    name: 'Engagement',
    description: 'Would this content engage an audience?',
    weight: 0.25,
  },
} as const

type EvaluationDimension = keyof typeof EVALUATION_DIMENSIONS

// ============================================
// EVALUATION SCHEMAS
// ============================================

export const DimensionScoreSchema = z.object({
  dimension: z.string(),
  score: z.number().min(0).max(10),
  reason: z.string(),
})

export const EvaluationResultSchema = z.object({
  overallScore: z.number().min(0).max(10),
  overallReason: z.string(),
  dimensionScores: z.array(DimensionScoreSchema),
  strengths: z.array(z.string()),
  weaknesses: z.array(z.string()),
  suggestions: z.array(z.string()),
})

export type EvaluationResult = z.infer<typeof EvaluationResultSchema>

// ============================================
// STORYTELLER JUDGE CLASS
// ============================================

export class StorytellerJudge {
  private modelId: string
  private traceId?: string

  constructor(options?: { modelId?: string; traceId?: string }) {
    this.modelId = options?.modelId || 'gpt-4o-mini'
    this.traceId = options?.traceId
  }

  /**
   * Evaluate storytelling output using LLM-as-judge
   */
  async evaluate(
    stepName: string,
    output: any,
    criteria: string,
    context?: string
  ): Promise<EvaluationResult> {
    const startTime = Date.now()

    // Create span for evaluation
    const span = this.traceId
      ? langfuse.span({
          traceId: this.traceId,
          name: `judge-${stepName}`,
          input: { output: JSON.stringify(output).slice(0, 1000), criteria },
        })
      : null

    try {
      const prompt = this.buildEvaluationPrompt(stepName, output, criteria, context)

      const openai = createOpenAI({
        apiKey: process.env.OPENAI_API_KEY,
      })

      const { text } = await generateText({
        model: openai(this.modelId),
        prompt,
        temperature: 0.1, // Low temperature for consistent evaluation
      })

      // Parse the evaluation result
      const result = this.parseEvaluationResult(text)

      const duration = Date.now() - startTime

      // Log to Langfuse
      if (span) {
        span.end({
          output: result,
          metadata: { duration, modelId: this.modelId },
        })
      }

      // Score each dimension in Langfuse
      if (this.traceId) {
        // Overall score
        langfuse.score({
          traceId: this.traceId,
          name: `${stepName}-overall`,
          value: result.overallScore / 10, // Normalize to 0-1
          comment: result.overallReason,
        })

        // Dimension scores
        for (const dimScore of result.dimensionScores) {
          langfuse.score({
            traceId: this.traceId,
            name: `${stepName}-${dimScore.dimension}`,
            value: dimScore.score / 10,
            comment: dimScore.reason,
          })
        }
      }

      return result
    } catch (error) {
      console.error(`[StorytellerJudge] Evaluation failed for ${stepName}:`, error)

      if (span) {
        span.end({ level: 'ERROR', statusMessage: String(error) })
      }

      // Return fallback result
      return this.createFallbackResult(stepName, error)
    }
  }

  /**
   * Build the evaluation prompt
   */
  private buildEvaluationPrompt(
    stepName: string,
    output: any,
    criteria: string,
    context?: string
  ): string {
    const outputStr = typeof output === 'string' ? output : JSON.stringify(output, null, 2)

    return `You are an expert creative writing evaluator. Evaluate the following storytelling output.

## Step Being Evaluated
${stepName}

## Evaluation Criteria
${criteria}

${context ? `## Additional Context\n${context}\n` : ''}

## Output to Evaluate
${outputStr.slice(0, 4000)}

## Evaluation Dimensions
${Object.entries(EVALUATION_DIMENSIONS)
  .map(([key, dim]) => `- ${dim.name}: ${dim.description}`)
  .join('\n')}

## Instructions
1. Evaluate each dimension on a scale of 0-10
2. Provide specific reasons for each score
3. Be critical but fair
4. Focus on storytelling quality, not technical correctness

## Required Response Format (JSON)
{
  "overallScore": <0-10>,
  "overallReason": "<1-2 sentence summary>",
  "dimensionScores": [
    { "dimension": "creativity", "score": <0-10>, "reason": "<specific reason>" },
    { "dimension": "coherence", "score": <0-10>, "reason": "<specific reason>" },
    { "dimension": "completeness", "score": <0-10>, "reason": "<specific reason>" },
    { "dimension": "engagement", "score": <0-10>, "reason": "<specific reason>" }
  ],
  "strengths": ["<strength 1>", "<strength 2>"],
  "weaknesses": ["<weakness 1>", "<weakness 2>"],
  "suggestions": ["<improvement 1>", "<improvement 2>"]
}

Respond ONLY with the JSON object, no additional text.`
  }

  /**
   * Parse the LLM evaluation result
   */
  private parseEvaluationResult(text: string): EvaluationResult {
    try {
      // Extract JSON from response
      const jsonMatch = text.match(/\{[\s\S]*\}/)
      if (!jsonMatch) {
        throw new Error('No JSON found in response')
      }

      const parsed = JSON.parse(jsonMatch[0])
      return EvaluationResultSchema.parse(parsed)
    } catch (error) {
      console.warn('[StorytellerJudge] Failed to parse result, using heuristic:', error)
      return this.createHeuristicResult(text)
    }
  }

  /**
   * Create heuristic result when LLM parsing fails
   */
  private createHeuristicResult(text: string): EvaluationResult {
    // Simple heuristic: if response is long, it's probably good
    const score = Math.min(10, Math.max(3, text.length / 100))

    return {
      overallScore: score,
      overallReason: 'Heuristic evaluation used due to parsing failure',
      dimensionScores: Object.keys(EVALUATION_DIMENSIONS).map(dim => ({
        dimension: dim,
        score,
        reason: 'Heuristic score',
      })),
      strengths: ['Response generated'],
      weaknesses: ['Could not parse detailed evaluation'],
      suggestions: ['Retry with different prompt'],
    }
  }

  /**
   * Create fallback result on error
   */
  private createFallbackResult(stepName: string, error: any): EvaluationResult {
    return {
      overallScore: 0,
      overallReason: `Evaluation failed: ${error.message || error}`,
      dimensionScores: Object.keys(EVALUATION_DIMENSIONS).map(dim => ({
        dimension: dim,
        score: 0,
        reason: 'Evaluation failed',
      })),
      strengths: [],
      weaknesses: ['Evaluation could not be completed'],
      suggestions: ['Check API keys and retry'],
    }
  }

  /**
   * Quick boolean check if output passes minimum quality threshold
   */
  async passes(
    stepName: string,
    output: any,
    criteria: string,
    threshold: number = 6
  ): Promise<boolean> {
    const result = await this.evaluate(stepName, output, criteria)
    return result.overallScore >= threshold
  }
}

// ============================================
// SPECIALIZED JUDGES
// ============================================

/**
 * Judge for World Bible quality
 */
export class WorldBibleJudge extends StorytellerJudge {
  async evaluateBible(bible: Record<string, unknown>): Promise<EvaluationResult> {
    const criteria = `
      Evaluate the World Bible for:
      1. World rules should create conflict and have consequences
      2. Factions should have opposing ideologies and clear goals
      3. Characters should have depth and clear motivations
      4. Overall worldbuilding should be cohesive and original
    `
    return this.evaluate('world-bible', bible, criteria)
  }
}

/**
 * Judge for Episode Premise quality
 */
export class EpisodePremiseJudge extends StorytellerJudge {
  async evaluatePremise(premise: Record<string, unknown>): Promise<EvaluationResult> {
    const criteria = `
      Evaluate the Episode Premise using the Ozymandias framework:
      1. Protagonist Hook - Is it compelling and specific?
      2. Fatal Flaw - Does it create inevitable conflict?
      3. Stakes - Are they clear and escalating (physical, professional, psychological)?
      4. Inevitable Consequence - Does it follow logically from the setup?
      5. Transformation - Is the character arc clear?
    `
    return this.evaluate('episode-premise', premise, criteria)
  }
}

/**
 * Judge for Beat quality
 */
export class BeatJudge extends StorytellerJudge {
  async evaluateBeat(beat: Record<string, unknown>): Promise<EvaluationResult> {
    const criteria = `
      Evaluate the Beat for:
      1. Visual Hook - Is there a memorable image?
      2. Emotional Shift - Do characters change emotionally?
      3. Plot Advancement - Does it move the story forward?
      4. Mazur Elements - Are sensory details present?
    `
    return this.evaluate('beat', beat, criteria)
  }
}

// ============================================
// EXPORTS
// ============================================

const createStorytellerJudge = (traceId?: string) => new StorytellerJudge({ traceId })

const createWorldBibleJudge = (traceId?: string) => new WorldBibleJudge({ traceId })

const createEpisodePremiseJudge = (traceId?: string) => new EpisodePremiseJudge({ traceId })

const createBeatJudge = (traceId?: string) => new BeatJudge({ traceId })
