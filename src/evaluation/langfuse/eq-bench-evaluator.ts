/**
 * EQ-Bench Style Evaluator for Langfuse
 *
 * Based on arxiv.org/html/2312.06281v2 methodology:
 * - Dialogue-based emotion intensity rating (0-10 scale)
 * - Critique-and-revision prompting (initial + self-critique + final)
 * - Normalized scoring for comparison
 *
 * This integrates directly with Langfuse's evaluation features.
 */

import { z } from 'zod'
import { langfuse } from '../../agent-core/observability'
import { compileLangfusePrompt } from '../../prompts/langfuse-sync'
import {
  EQ_BENCH_EMOTION_JUDGE,
  EQ_BENCH_MAGIC_JUDGE,
  EQ_BENCH_CONSISTENCY_JUDGE,
} from '../../prompts/storyteller-prompts'

// =============================================================================
// TYPES
// =============================================================================

export interface EQBenchConfig {
  /** Model to use for evaluation */
  model: string
  /** Temperature (low for consistency, as per EQ-Bench) */
  temperature: number
  /** Maximum tokens for response */
  maxTokens: number
  /** Whether to use Langfuse-hosted prompts */
  useLangfusePrompts: boolean
}

export const DEFAULT_EQ_BENCH_CONFIG: EQBenchConfig = {
  model: 'gpt-4o',
  temperature: 0.01, // As per EQ-Bench paper
  maxTokens: 2000,
  useLangfusePrompts: false, // Use local prompts by default (set true after pushing to Langfuse)
}

// Schema for emotion scores
export const EmotionScoresSchema = z.object({
  fear: z.number().min(0).max(10),
  anger: z.number().min(0).max(10),
  joy: z.number().min(0).max(10),
  sadness: z.number().min(0).max(10),
  surprise: z.number().min(0).max(10),
  disgust: z.number().min(0).max(10),
  trust: z.number().min(0).max(10),
  anticipation: z.number().min(0).max(10),
})

export const EmotionJudgeOutputSchema = z.object({
  characters: z.record(z.string(), EmotionScoresSchema),
  overallEmotionalTruth: z.number().min(0).max(100),
  reasoning: z.string(),
  revision: z.string().optional(),
})

export const MagicJudgeOutputSchema = z.object({
  dimensions: z.object({
    originality: z.number().min(0).max(100),
    characterSpecificity: z.number().min(0).max(100),
    proseVoice: z.number().min(0).max(100),
    emotionalTruth: z.number().min(0).max(100),
    memorability: z.number().min(0).max(100),
    riskTaking: z.number().min(0).max(100),
  }),
  sparks: z.array(z.object({
    quote: z.string(),
    why: z.string(),
  })),
  slop: z.array(z.object({
    quote: z.string(),
    category: z.string(),
  })),
  overallMagic: z.number().min(0).max(100),
  reasoning: z.string(),
  revision: z.string().optional(),
})

export const ConsistencyJudgeOutputSchema = z.object({
  factsClaimed: z.array(z.string()),
  factsVerified: z.array(z.string()),
  violations: z.array(z.object({
    fact: z.string(),
    contradicts: z.string(),
    severity: z.enum(['CRITICAL', 'MODERATE', 'MINOR']),
    intentional: z.boolean(),
    quote: z.string(),
  })),
  overallConsistency: z.number().min(0).max(100),
  reasoning: z.string(),
  revision: z.string().optional(),
})

export type EmotionJudgeOutput = z.infer<typeof EmotionJudgeOutputSchema>
export type MagicJudgeOutput = z.infer<typeof MagicJudgeOutputSchema>
export type ConsistencyJudgeOutput = z.infer<typeof ConsistencyJudgeOutputSchema>

// =============================================================================
// EQ-BENCH EVALUATOR
// =============================================================================

export class EQBenchEvaluator {
  private config: EQBenchConfig

  constructor(config: Partial<EQBenchConfig> = {}) {
    this.config = { ...DEFAULT_EQ_BENCH_CONFIG, ...config }
  }

  /**
   * Evaluate emotional resonance using EQ-Bench methodology
   */
  async evaluateEmotion(
    content: string,
    traceId?: string
  ): Promise<{ score: number; output: EmotionJudgeOutput; raw: string }> {
    const id = traceId || `eq-emotion-${Date.now()}`

    const trace = langfuse.trace({
      id,
      name: 'EQ-Bench: Emotion',
      metadata: { evaluator: 'eq-bench-emotion', model: this.config.model },
      input: { content: content.slice(0, 500) },
    })

    try {
      // Get prompt (from Langfuse or local)
      let promptText: string
      if (this.config.useLangfusePrompts) {
        const compiled = await compileLangfusePrompt('eq-bench-emotion-judge', { content })
        promptText = compiled || this.compileLocalPrompt(EQ_BENCH_EMOTION_JUDGE.text, { content })
      } else {
        promptText = this.compileLocalPrompt(EQ_BENCH_EMOTION_JUDGE.text, { content })
      }

      // Call LLM
      const generation = trace.generation({
        name: 'llm-judge',
        model: this.config.model,
        input: promptText,
        modelParameters: {
          temperature: this.config.temperature,
          maxTokens: this.config.maxTokens,
        },
      })

      const raw = await this.callLLM(promptText)
      generation.end({ output: raw })

      // Parse response
      const output = this.parseResponse(raw, EmotionJudgeOutputSchema)

      // Calculate normalized score (EQ-Bench style)
      const score = this.normalizeEmotionScore(output)

      // Record score in Langfuse
      trace.score({
        name: 'eq_emotion_score',
        value: score,
        comment: output.reasoning.slice(0, 500),
      })

      trace.update({ output: { score, overallEmotionalTruth: output.overallEmotionalTruth } })

      return { score, output, raw }
    } catch (error: any) {
      console.error('[EQBench] Emotion evaluation failed:', error)
      trace.update({ output: { error: error.message }, metadata: { error: true } })
      throw error
    } finally {
      await langfuse.flush()
    }
  }

  /**
   * Evaluate magic score using EQ-Bench methodology
   */
  async evaluateMagic(
    content: string,
    context?: string,
    traceId?: string
  ): Promise<{ score: number; output: MagicJudgeOutput; raw: string }> {
    const id = traceId || `eq-magic-${Date.now()}`

    const trace = langfuse.trace({
      id,
      name: 'EQ-Bench: Magic',
      metadata: { evaluator: 'eq-bench-magic', model: this.config.model },
      input: { content: content.slice(0, 500), context: context?.slice(0, 200) },
    })

    try {
      // Get prompt
      let promptText: string
      const variables = { content, context: context || 'No additional context provided.' }

      if (this.config.useLangfusePrompts) {
        const compiled = await compileLangfusePrompt('eq-bench-magic-judge', variables)
        promptText = compiled || this.compileLocalPrompt(EQ_BENCH_MAGIC_JUDGE.text, variables)
      } else {
        promptText = this.compileLocalPrompt(EQ_BENCH_MAGIC_JUDGE.text, variables)
      }

      // Call LLM
      const generation = trace.generation({
        name: 'llm-judge',
        model: this.config.model,
        input: promptText,
        modelParameters: {
          temperature: this.config.temperature,
          maxTokens: this.config.maxTokens,
        },
      })

      const raw = await this.callLLM(promptText)
      generation.end({ output: raw })

      // Parse response
      const output = this.parseResponse(raw, MagicJudgeOutputSchema)

      // Calculate weighted score
      const score = this.calculateMagicScore(output)

      // Record scores in Langfuse
      trace.score({ name: 'eq_magic_score', value: score, comment: output.reasoning.slice(0, 500) })
      trace.score({ name: 'eq_originality', value: output.dimensions.originality / 100 })
      trace.score({ name: 'eq_character_specificity', value: output.dimensions.characterSpecificity / 100 })
      trace.score({ name: 'eq_prose_voice', value: output.dimensions.proseVoice / 100 })
      trace.score({ name: 'eq_emotional_truth', value: output.dimensions.emotionalTruth / 100 })
      trace.score({ name: 'eq_memorability', value: output.dimensions.memorability / 100 })
      trace.score({ name: 'eq_risk_taking', value: output.dimensions.riskTaking / 100 })

      trace.update({ output: { score, dimensions: output.dimensions } })

      return { score, output, raw }
    } catch (error: any) {
      console.error('[EQBench] Magic evaluation failed:', error)
      trace.update({ output: { error: error.message }, metadata: { error: true } })
      throw error
    } finally {
      await langfuse.flush()
    }
  }

  /**
   * Evaluate consistency using EQ-Bench methodology
   */
  async evaluateConsistency(
    content: string,
    canon: string,
    traceId?: string
  ): Promise<{ score: number; output: ConsistencyJudgeOutput; raw: string }> {
    const id = traceId || `eq-consistency-${Date.now()}`

    const trace = langfuse.trace({
      id,
      name: 'EQ-Bench: Consistency',
      metadata: { evaluator: 'eq-bench-consistency', model: this.config.model },
      input: { content: content.slice(0, 500), canon: canon.slice(0, 500) },
    })

    try {
      // Get prompt
      let promptText: string
      const variables = { content, canon }

      if (this.config.useLangfusePrompts) {
        const compiled = await compileLangfusePrompt('eq-bench-consistency-judge', variables)
        promptText = compiled || this.compileLocalPrompt(EQ_BENCH_CONSISTENCY_JUDGE.text, variables)
      } else {
        promptText = this.compileLocalPrompt(EQ_BENCH_CONSISTENCY_JUDGE.text, variables)
      }

      // Call LLM
      const generation = trace.generation({
        name: 'llm-judge',
        model: this.config.model,
        input: promptText,
        modelParameters: {
          temperature: this.config.temperature,
          maxTokens: this.config.maxTokens,
        },
      })

      const raw = await this.callLLM(promptText)
      generation.end({ output: raw })

      // Parse response
      const output = this.parseResponse(raw, ConsistencyJudgeOutputSchema)

      // Calculate score
      const score = output.overallConsistency / 100

      // Record scores
      trace.score({ name: 'eq_consistency_score', value: score, comment: output.reasoning.slice(0, 500) })
      trace.score({ name: 'eq_violations_count', value: output.violations.length })

      trace.update({ output: { score, violationsCount: output.violations.length } })

      return { score, output, raw }
    } catch (error: any) {
      console.error('[EQBench] Consistency evaluation failed:', error)
      trace.update({ output: { error: error.message }, metadata: { error: true } })
      throw error
    } finally {
      await langfuse.flush()
    }
  }

  /**
   * Run full EQ-Bench evaluation suite
   */
  async evaluateFull(
    content: string,
    options: {
      context?: string
      canon?: string
      traceId?: string
    } = {}
  ): Promise<{
    emotion: { score: number; output: EmotionJudgeOutput }
    magic: { score: number; output: MagicJudgeOutput }
    consistency?: { score: number; output: ConsistencyJudgeOutput }
    composite: number
  }> {
    const baseTraceId = options.traceId || `eq-full-${Date.now()}`

    // Run evaluations in parallel
    const [emotion, magic] = await Promise.all([
      this.evaluateEmotion(content, `${baseTraceId}-emotion`),
      this.evaluateMagic(content, options.context, `${baseTraceId}-magic`),
    ])

    let consistency: { score: number; output: ConsistencyJudgeOutput } | undefined
    if (options.canon) {
      const consistencyResult = await this.evaluateConsistency(content, options.canon, `${baseTraceId}-consistency`)
      consistency = { score: consistencyResult.score, output: consistencyResult.output }
    }

    // Calculate composite score
    const weights = { emotion: 0.3, magic: 0.5, consistency: 0.2 }
    let composite: number

    if (consistency) {
      composite =
        emotion.score * weights.emotion +
        magic.score * weights.magic +
        consistency.score * weights.consistency
    } else {
      // Redistribute weights if no consistency check
      composite = emotion.score * 0.4 + magic.score * 0.6
    }

    // Record composite score
    const compositeTrace = langfuse.trace({
      id: `${baseTraceId}-composite`,
      name: 'EQ-Bench: Composite',
      metadata: { evaluator: 'eq-bench-composite' },
      input: { contentLength: content.length },
    })

    compositeTrace.score({ name: 'eq_composite_score', value: composite })
    compositeTrace.update({ output: { composite, emotion: emotion.score, magic: magic.score } })

    await langfuse.flush()

    return {
      emotion: { score: emotion.score, output: emotion.output },
      magic: { score: magic.score, output: magic.output },
      consistency,
      composite,
    }
  }

  // ==========================================================================
  // PRIVATE METHODS
  // ==========================================================================

  private async callLLM(prompt: string): Promise<string> {
    const OpenAI = (await import('openai')).default
    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

    const response = await openai.chat.completions.create({
      model: this.config.model,
      messages: [
        {
          role: 'system',
          content: `You are an expert evaluator for creative writing.
Respond ONLY with valid JSON matching the requested schema.
Be rigorous and use the full range of scores.`,
        },
        { role: 'user', content: prompt },
      ],
      temperature: this.config.temperature,
      max_tokens: this.config.maxTokens,
      response_format: { type: 'json_object' },
    })

    return response.choices[0].message.content || '{}'
  }

  private parseResponse<T>(raw: string, schema: z.ZodType<T>): T {
    try {
      let cleaned = raw.replace(/```json/g, '').replace(/```/g, '').trim()
      const jsonMatch = cleaned.match(/\{[\s\S]*\}/)
      if (jsonMatch) cleaned = jsonMatch[0]

      const parsed = JSON.parse(cleaned)
      const result = schema.safeParse(parsed)

      if (!result.success) {
        console.warn('[EQBench] Schema validation failed:', result.error)
        return parsed as T
      }

      return result.data
    } catch (error) {
      console.error('[EQBench] Parse error:', error)
      throw new Error(`Failed to parse LLM response: ${error}`)
    }
  }

  private compileLocalPrompt(template: string, variables: Record<string, string>): string {
    return template.replace(/\{\{(\w+)\}\}/g, (_, key) => variables[key] || `{{${key}}}`)
  }

  /**
   * Normalize emotion scores using EQ-Bench methodology
   * - Sum emotions to 10 (normalization)
   * - Higher score = better emotional portrayal
   */
  private normalizeEmotionScore(output: EmotionJudgeOutput): number {
    // Use the overall emotional truth as the primary score
    return output.overallEmotionalTruth / 100
  }

  /**
   * Calculate weighted magic score
   */
  private calculateMagicScore(output: MagicJudgeOutput): number {
    const weights = {
      originality: 0.15,
      characterSpecificity: 0.20,
      proseVoice: 0.15,
      emotionalTruth: 0.20,
      memorability: 0.15,
      riskTaking: 0.15,
    }

    const weightedSum =
      output.dimensions.originality * weights.originality +
      output.dimensions.characterSpecificity * weights.characterSpecificity +
      output.dimensions.proseVoice * weights.proseVoice +
      output.dimensions.emotionalTruth * weights.emotionalTruth +
      output.dimensions.memorability * weights.memorability +
      output.dimensions.riskTaking * weights.riskTaking

    return weightedSum / 100
  }
}

// =============================================================================
// FACTORY FUNCTIONS
// =============================================================================

let evaluatorInstance: EQBenchEvaluator | null = null

export function getEQBenchEvaluator(config?: Partial<EQBenchConfig>): EQBenchEvaluator {
  if (!evaluatorInstance || config) {
    evaluatorInstance = new EQBenchEvaluator(config)
  }
  return evaluatorInstance
}

/**
 * Quick evaluation helper
 */
export async function quickEQBenchEval(
  content: string,
  options?: { context?: string; canon?: string }
): Promise<{
  emotion: number
  magic: number
  consistency?: number
  composite: number
}> {
  const evaluator = getEQBenchEvaluator()
  const result = await evaluator.evaluateFull(content, options)

  return {
    emotion: result.emotion.score,
    magic: result.magic.score,
    consistency: result.consistency?.score,
    composite: result.composite,
  }
}

// =============================================================================
// LANGFUSE EXPERIMENT API (for LLM-as-judge tab)
// =============================================================================

export interface DatasetItem {
  id: string
  input: string
  expectedOutput?: string
  metadata?: Record<string, any>
}

/**
 * Create Langfuse-compatible evaluators for experiment.run()
 * These return { name, value, comment } format required by Langfuse
 */
export function createLangfuseEvaluators(config?: Partial<EQBenchConfig>) {
  const evaluator = new EQBenchEvaluator(config)

  const emotionEvaluator = async ({ output }: { input: string; output: string; expectedOutput?: string }) => {
    try {
      const result = await evaluator.evaluateEmotion(output)
      return {
        name: 'eq_emotion',
        value: result.score,
        comment: result.output.reasoning.slice(0, 500),
      }
    } catch (error: any) {
      return { name: 'eq_emotion', value: 0, comment: `Error: ${error.message}` }
    }
  }

  const magicEvaluator = async ({ output }: { input: string; output: string; expectedOutput?: string }) => {
    try {
      const result = await evaluator.evaluateMagic(output)
      return {
        name: 'eq_magic',
        value: result.score,
        comment: result.output.reasoning.slice(0, 500),
      }
    } catch (error: any) {
      return { name: 'eq_magic', value: 0, comment: `Error: ${error.message}` }
    }
  }

  const compositeEvaluator = async ({ output }: { input: string; output: string; expectedOutput?: string }) => {
    try {
      const emotion = await evaluator.evaluateEmotion(output)
      const magic = await evaluator.evaluateMagic(output)
      const composite = emotion.score * 0.4 + magic.score * 0.6
      return {
        name: 'eq_composite',
        value: composite,
        comment: `Emotion: ${(emotion.score * 100).toFixed(1)}%, Magic: ${(magic.score * 100).toFixed(1)}%`,
      }
    } catch (error: any) {
      return { name: 'eq_composite', value: 0, comment: `Error: ${error.message}` }
    }
  }

  return { emotionEvaluator, magicEvaluator, compositeEvaluator }
}

/**
 * Run evaluation using Langfuse Dataset API
 * This will show up in the LLM-as-judge / Evals tab
 */
export async function runLangfuseExperiment(
  experimentName: string,
  data: Array<{ input: string; output: string; expectedOutput?: string }>,
  config?: Partial<EQBenchConfig>
): Promise<any> {
  const evaluator = new EQBenchEvaluator(config)
  const datasetName = `eq-bench-dataset-${Date.now()}`
  const runName = experimentName

  console.log(`Creating dataset: ${datasetName}`)

  // 1. Create dataset
  try {
    await (langfuse as any).api.datasetsCreate({
      name: datasetName,
      description: 'EQ-Bench evaluation dataset',
      metadata: { type: 'eq-bench', model: config?.model || 'gpt-4o' },
    })
    console.log(`Dataset created: ${datasetName}`)
  } catch (error: any) {
    // Dataset might already exist
    console.log(`Dataset creation: ${error.message}`)
  }

  // 2. Add items to dataset
  console.log(`Adding ${data.length} items to dataset...`)
  const datasetItems: string[] = []

  for (let i = 0; i < data.length; i++) {
    const item = data[i]
    const itemId = `${datasetName}-item-${i}`

    try {
      await (langfuse as any).api.datasetItemsCreate({
        datasetName,
        id: itemId,
        input: { prompt: item.input },
        expectedOutput: item.expectedOutput ? { text: item.expectedOutput } : undefined,
        metadata: { output: item.output },
      })
      datasetItems.push(itemId)
    } catch (error: any) {
      console.error(`Failed to create dataset item ${i}:`, error.message)
    }
  }

  // 3. Run evaluation and create dataset run items
  console.log(`Running evaluation on ${datasetItems.length} items...`)
  const results: any[] = []

  for (let i = 0; i < data.length; i++) {
    const item = data[i]
    const itemId = datasetItems[i]
    if (!itemId) continue

    console.log(`[${i + 1}/${data.length}] Evaluating...`)

    // Create trace for this evaluation
    const traceId = `${runName}-${i}-${Date.now()}`
    const trace = langfuse.trace({
      id: traceId,
      name: `EQ-Bench: Item ${i}`,
      metadata: { datasetName, runName, itemIndex: i },
      input: { content: item.output.slice(0, 500) },
    })

    try {
      // Run evaluation
      const emotion = await evaluator.evaluateEmotion(item.output, `${traceId}-emotion`)
      const magic = await evaluator.evaluateMagic(item.output, item.input, `${traceId}-magic`)
      const composite = emotion.score * 0.4 + magic.score * 0.6

      // Record scores on trace
      trace.score({ name: 'eq_emotion', value: emotion.score, comment: emotion.output.reasoning.slice(0, 300) })
      trace.score({ name: 'eq_magic', value: magic.score, comment: magic.output.reasoning.slice(0, 300) })
      trace.score({ name: 'eq_composite', value: composite })

      trace.update({ output: { emotion: emotion.score, magic: magic.score, composite } })

      // Link trace to dataset run item
      try {
        await (langfuse as any).api.datasetRunItemsCreate({
          datasetItemId: itemId,
          traceId,
          runName,
          metadata: { scores: { emotion: emotion.score, magic: magic.score, composite } },
        })
      } catch (linkError: any) {
        console.warn(`Failed to link to dataset: ${linkError.message}`)
      }

      results.push({
        itemId,
        emotion: emotion.score,
        magic: magic.score,
        composite,
      })

      console.log(`  Emotion: ${(emotion.score * 100).toFixed(1)}% | Magic: ${(magic.score * 100).toFixed(1)}% | Composite: ${(composite * 100).toFixed(1)}%`)
    } catch (error: any) {
      console.error(`  Error: ${error.message}`)
      trace.update({ output: { error: error.message }, metadata: { error: true } })
    }
  }

  await langfuse.flush()

  return {
    datasetName,
    runName,
    itemCount: results.length,
    results,
    averages: {
      emotion: results.reduce((a, r) => a + r.emotion, 0) / results.length,
      magic: results.reduce((a, r) => a + r.magic, 0) / results.length,
      composite: results.reduce((a, r) => a + r.composite, 0) / results.length,
    },
  }
}
