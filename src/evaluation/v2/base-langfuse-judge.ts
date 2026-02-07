/**
 * Base Langfuse LLM-as-Judge
 *
 * Foundation for all LLM-based judges with Langfuse integration.
 * Implements best practices from LLM-as-Judge research:
 * - Structured output for reliable parsing
 * - Chain-of-thought reasoning
 * - Distance-based scoring (not binary)
 * - Bias mitigation through zero-shot prompting
 */

import { z } from 'zod'
import { langfuse, recordCreativeEvaluation, type ScoreDataType } from '@/agent-core/observability'
import {
  Judge,
  JudgeConfig,
  JudgeOutput,
  DEFAULT_JUDGE_CONFIG,
  ScoreName,
  StorytellerContext,
} from './types'

export abstract class BaseLangfuseJudge<TOutput = any> implements Judge<any, TOutput> {
  abstract name: string
  abstract scoreName: ScoreName
  config: JudgeConfig

  constructor(config: Partial<JudgeConfig> = {}) {
    this.config = { ...DEFAULT_JUDGE_CONFIG, ...config }
  }

  /**
   * Build the evaluation prompt
   * Subclasses implement this to define their specific evaluation criteria
   */
  protected abstract buildPrompt(
    input: string,
    output: string,
    context?: StorytellerContext,
    expected?: string
  ): string

  /**
   * Get the Zod schema for structured output
   */
  protected abstract getOutputSchema(): z.ZodType<TOutput>

  /**
   * Extract the final score from the parsed output (0-1)
   */
  protected abstract extractScore(parsed: TOutput): number

  /**
   * Extract reasoning from the parsed output
   */
  protected abstract extractReasoning(parsed: TOutput): string

  /**
   * Main evaluation method
   * 
   * Per Langfuse SDK docs (https://langfuse.com/docs/evaluation/evaluation-methods/scores-via-sdk):
   * - Uses idempotency keys to prevent duplicate scores
   * - Explicitly sets dataType: 'NUMERIC' for all scores
   * - Records multi-dimensional scores for comprehensive analysis
   */
  async evaluate(
    input: string,
    output: string,
    context?: StorytellerContext,
    expected?: string
  ): Promise<JudgeOutput<TOutput>> {
    const traceId = `judge-${this.name}-${Date.now()}`

    // Create Langfuse trace for this evaluation
    const trace = langfuse.trace({
      id: traceId,
      name: `Judge: ${this.name}`,
      metadata: {
        judge: this.name,
        scoreName: this.scoreName,
        model: this.config.model,
      },
      input: { input: input.slice(0, 500), output: output.slice(0, 500) },
      tags: ['evaluation', 'llm-judge', this.scoreName],
    })

    try {
      // Build prompt
      const prompt = this.buildPrompt(input, output, context, expected)

      // Create generation span
      const generation = trace.generation({
        name: 'llm-judge-call',
        model: this.config.model,
        input: prompt,
        modelParameters: {
          temperature: this.config.temperature,
          maxTokens: this.config.maxTokens,
        },
      })

      // Call LLM with structured output
      const response = await this.callLLM(prompt)

      generation.end({
        output: response,
        usage: {
          // These would be populated from actual API response
          promptTokens: Math.ceil(prompt.length / 4),
          completionTokens: Math.ceil(response.length / 4),
        },
      })

      // Parse response
      const parsed = this.parseResponse(response)

      // Extract score and reasoning
      const score = this.normalizeScore(this.extractScore(parsed))
      const reasoning = this.extractReasoning(parsed)

      // Record primary score in Langfuse with idempotency key
      // Per SDK docs: id parameter prevents duplicate scores
      langfuse.score({
        traceId,
        name: this.scoreName,
        value: score,
        comment: reasoning.slice(0, 500),
        dataType: 'NUMERIC',
        id: `${traceId}-${this.scoreName}`, // Idempotency key
      })

      // Record sub-dimension scores if available (per scientific eval guide)
      this.recordSubScores(traceId, parsed)

      trace.update({
        output: { score, reasoning: reasoning.slice(0, 200) },
      })

      return {
        score,
        scoreName: this.scoreName,
        reasoning,
        confidence: this.calculateConfidence(parsed),
        details: parsed,
      }
    } catch (error: any) {
      console.error(`[${this.name}] Evaluation failed:`, error)

      trace.update({
        output: { error: error.message },
        metadata: { error: true },
      })

      // Record failed evaluation score
      langfuse.score({
        traceId,
        name: this.scoreName,
        value: 0,
        comment: `Evaluation failed: ${error.message}`,
        dataType: 'NUMERIC',
        id: `${traceId}-${this.scoreName}`,
      })

      return {
        score: 0,
        scoreName: this.scoreName,
        reasoning: `Evaluation failed: ${error.message}`,
        confidence: 0,
        details: {} as TOutput,
      }
    } finally {
      await langfuse.flush()
    }
  }

  /**
   * Record sub-dimension scores for comprehensive evaluation
   * Override in subclasses to record specific dimension scores
   */
  protected recordSubScores(traceId: string, parsed: TOutput): void {
    // Default implementation - subclasses can override
    // to record magic, consistency, anti-slop dimensions etc.
  }

  /**
   * Call the LLM using OpenAI
   */
  protected async callLLM(prompt: string): Promise<string> {
    const OpenAI = (await import('openai')).default
    const openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    })

    const response = await openai.chat.completions.create({
      model: this.config.model,
      messages: [
        {
          role: 'system',
          content: this.getSystemPrompt(),
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
      temperature: this.config.temperature,
      max_tokens: this.config.maxTokens,
      response_format: this.config.structuredOutput ? { type: 'json_object' } : undefined,
    })

    return response.choices[0].message.content || ''
  }

  /**
   * System prompt for the judge
   */
  protected getSystemPrompt(): string {
    return `You are an expert evaluator for creative writing and storytelling.
Your role is to assess content objectively using specific criteria.

IMPORTANT GUIDELINES:
1. Be rigorous but fair - acknowledge both strengths and weaknesses
2. Provide specific evidence for your assessments
3. Use the full range of scores (0-100), not just extremes
4. Think step-by-step before assigning scores
5. Consider context and genre appropriateness
6. Your response must be valid JSON matching the requested schema

Reference standards for quality:
- TV/Film: Breaking Bad, The Wire, Better Call Saul, Severance
- Games: Red Dead Redemption 2, The Witcher 3, Disco Elysium
- Literature: Cormac McCarthy, George R.R. Martin, Ursula K. Le Guin`
  }

  /**
   * Parse LLM response into typed output
   */
  protected parseResponse(response: string): TOutput {
    try {
      // Clean up response
      let cleaned = response
        .replace(/```json/g, '')
        .replace(/```/g, '')
        .trim()

      // Find JSON object
      const jsonMatch = cleaned.match(/\{[\s\S]*\}/)
      if (jsonMatch) {
        cleaned = jsonMatch[0]
      }

      const parsed = JSON.parse(cleaned)
      const schema = this.getOutputSchema()

      // Validate against schema
      const result = schema.safeParse(parsed)
      if (!result.success) {
        console.warn(`[${this.name}] Schema validation failed:`, result.error)
        // Return parsed anyway, let subclass handle partial data
        return parsed as TOutput
      }

      return result.data
    } catch (error) {
      console.error(`[${this.name}] Parse error:`, error)
      throw new Error(`Failed to parse LLM response: ${error}`)
    }
  }

  /**
   * Normalize score to 0-1 range
   */
  protected normalizeScore(score: number): number {
    // If score is 0-100, normalize to 0-1
    if (score > 1) {
      score = score / 100
    }
    return Math.max(0, Math.min(1, score))
  }

  /**
   * Calculate confidence based on parsed output
   * Subclasses can override for custom confidence calculation
   */
  protected calculateConfidence(parsed: TOutput): number {
    // Default: high confidence if we got a valid parse
    return 0.8
  }
}

/**
 * Helper to build context section for prompts
 */
export function buildContextSection(context?: StorytellerContext): string {
  if (!context) return ''

  const sections: string[] = []

  if (context.seriesBible) {
    sections.push(`SERIES BIBLE:
Title: ${context.seriesBible.title || 'Unknown'}
Genre: ${context.seriesBible.genre?.join(', ') || 'Unknown'}
Theme: ${context.seriesBible.centralTheme || 'Unknown'}
Tone: ${context.seriesBible.tone || 'Unknown'}
${context.seriesBible.worldRules?.length ? `World Rules:\n${context.seriesBible.worldRules.map(r => `- ${r}`).join('\n')}` : ''}`)
  }

  if (context.characters?.length) {
    sections.push(`CHARACTERS:
${context.characters.map(c => `- ${c.name} (${c.role}): ${c.motivation || 'Unknown motivation'}
  Voice: ${c.voice || 'Not specified'}
  Current State: ${c.currentState || 'Unknown'}`).join('\n')}`)
  }

  if (context.establishedFacts?.length) {
    sections.push(`ESTABLISHED FACTS:
${context.establishedFacts.map(f => `- ${f}`).join('\n')}`)
  }

  if (context.previousBeats?.length) {
    sections.push(`PREVIOUS BEATS:
${context.previousBeats.slice(-5).map(b => `- ${b.logline}`).join('\n')}`)
  }

  if (context.episodeContext) {
    sections.push(`EPISODE CONTEXT:
Premise: ${context.episodeContext.premise || 'Unknown'}
Target Emotion: ${context.episodeContext.targetEmotion || 'Unknown'}
Story Phase: ${context.episodeContext.storyPhase || 'Unknown'}`)
  }

  return sections.length > 0 ? `\n\nCONTEXT:\n${sections.join('\n\n')}` : ''
}
