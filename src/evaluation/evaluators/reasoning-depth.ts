/**
 * Reasoning Depth Evaluator
 *
 * Evaluates the quality and depth of agent reasoning.
 * Uses LLM-as-judge to assess thought process quality.
 */

import { ChatOpenAI } from '@langchain/openai'
import { CustomEvaluator, EvaluatorInput, EvaluatorResult } from '../types'

// ============================================
// HEURISTIC EVALUATOR
// ============================================

/**
 * Fast heuristic-based reasoning depth check
 *
 * Checks for structural indicators of reasoning:
 * - Explicit reasoning markers
 * - Multiple considerations
 * - Trade-off analysis
 * - Decision justification
 */
export const reasoningDepthHeuristic: CustomEvaluator = {
  name: 'reasoning-depth-heuristic',

  evaluate: async ({ output }: EvaluatorInput): Promise<EvaluatorResult> => {
    const response =
      typeof output === 'string' ? output : (output as any).response || JSON.stringify(output)

    if (!response || response.length < 50) {
      return {
        score: 0.5,
        reasoning: 'Response too short to evaluate reasoning',
        metadata: { skipped: true },
      }
    }

    let score = 0
    const indicators: string[] = []

    // Check for explicit reasoning markers
    const REASONING_MARKERS = [
      {
        pattern: /\b(because|since|therefore|thus|hence|so)\b/gi,
        name: 'causal connectors',
        weight: 0.1,
      },
      {
        pattern: /\b(consider(ing)?|think(ing)?|reason(ing)?)\b/gi,
        name: 'deliberation verbs',
        weight: 0.1,
      },
      {
        pattern:
          /\b(first(ly)?|second(ly)?|third(ly)?|finally|additionally|moreover|furthermore)\b/gi,
        name: 'enumeration',
        weight: 0.15,
      },
      {
        pattern: /\b(however|but|although|while|whereas|on the other hand)\b/gi,
        name: 'contrast markers',
        weight: 0.15,
      },
      {
        pattern: /\b(option|alternative|choice|approach|possibility)\b/gi,
        name: 'options considered',
        weight: 0.1,
      },
      {
        pattern: /\b(trade-?off|balance|weigh(ing)?|pros? and cons?)\b/gi,
        name: 'trade-off analysis',
        weight: 0.2,
      },
      { pattern: /\b(decide|chose|select|opt|prefer)\b/gi, name: 'decision language', weight: 0.1 },
      {
        pattern: /\b(best|better|optimal|ideal|recommend)\b/gi,
        name: 'recommendation',
        weight: 0.1,
      },
    ]

    for (const { pattern, name, weight } of REASONING_MARKERS) {
      const matches = response.match(pattern)
      if (matches && matches.length > 0) {
        score += weight
        indicators.push(`${name} (${matches.length}x)`)
      }
    }

    // Check for structured reasoning (numbered points, bullet points)
    const hasStructuredList = /(?:^|\n)\s*(?:\d+\.|[-•*])\s+\S/m.test(response)
    if (hasStructuredList) {
      score += 0.15
      indicators.push('structured list')
    }

    // Check for question acknowledgment
    const acknowledgesQuestion =
      /\b(you (asked|want|mentioned)|your (question|request)|regarding)\b/i.test(response)
    if (acknowledgesQuestion) {
      score += 0.05
      indicators.push('acknowledges query')
    }

    // Check for explicit uncertainty/confidence
    const showsUncertainty =
      /\b(might|may|could|possibly|perhaps|uncertain|not sure|depending on)\b/i.test(response)
    if (showsUncertainty) {
      score += 0.1
      indicators.push('appropriate uncertainty')
    }

    // Penalize very short responses with no reasoning
    if (response.length < 200 && indicators.length < 2) {
      score *= 0.5
      indicators.push('short with minimal reasoning')
    }

    // Cap score at 1.0
    score = Math.min(1, score)

    const reasoning =
      indicators.length > 0
        ? `Reasoning indicators: ${indicators.join(', ')}`
        : 'No clear reasoning indicators found'

    return {
      score,
      reasoning,
      metadata: { indicators },
    }
  },
}

// ============================================
// LLM EVALUATOR
// ============================================

const REASONING_JUDGE_PROMPT = `You are evaluating the reasoning quality of an AI agent's response.

## Agent Response
{response}

## Evaluation Dimensions

### 1. Understanding Depth (0-20 points)
- Does the agent show understanding of the underlying problem?
- Does it identify the key aspects that need to be addressed?

### 2. Multi-faceted Consideration (0-20 points)
- Does the agent consider multiple angles or perspectives?
- Are different options or approaches mentioned?

### 3. Logical Structure (0-20 points)
- Is the reasoning logically organized?
- Does it flow from premises to conclusions?

### 4. Evidence & Grounding (0-20 points)
- Does the agent reference specific facts, rules, or prior context?
- Is reasoning grounded in domain knowledge?

### 5. Decision Justification (0-20 points)
- If a decision is made, is it clearly justified?
- Are trade-offs acknowledged?

## Scoring Guidelines
- 0-40: Shallow/no reasoning - just provides answer without thought process
- 40-60: Basic reasoning - some explanation but superficial
- 60-80: Good reasoning - clear thought process, multiple considerations
- 80-100: Excellent reasoning - comprehensive, structured, well-justified

Respond with JSON only:
{
  "understandingDepth": { "score": 0-20, "evidence": "..." },
  "multiFacetedConsideration": { "score": 0-20, "evidence": "..." },
  "logicalStructure": { "score": 0-20, "evidence": "..." },
  "evidenceGrounding": { "score": 0-20, "evidence": "..." },
  "decisionJustification": { "score": 0-20, "evidence": "..." },
  "totalScore": 0-100,
  "strengthExamples": ["list of specific good reasoning examples"],
  "weaknessExamples": ["list of reasoning gaps or issues"]
}`

export const reasoningDepthEvaluator: CustomEvaluator = {
  name: 'reasoning-depth',

  evaluate: async ({ output }: EvaluatorInput): Promise<EvaluatorResult> => {
    const response =
      typeof output === 'string' ? output : (output as any).response || JSON.stringify(output)

    if (!response || response.length < 50) {
      return {
        score: 0.5,
        reasoning: 'Response too short to evaluate reasoning',
        metadata: { skipped: true },
      }
    }

    try {
      const model = new ChatOpenAI({
        modelName: 'gpt-4o-mini',
        temperature: 0,
      })

      const prompt = REASONING_JUDGE_PROMPT.replace('{response}', response.slice(0, 4000))

      const result = await model.invoke(prompt)
      const responseText =
        typeof result.content === 'string' ? result.content : JSON.stringify(result.content)

      const jsonMatch = responseText.match(/\{[\s\S]*\}/)
      if (!jsonMatch) {
        throw new Error('No JSON in response')
      }

      const parsed = JSON.parse(jsonMatch[0])

      const strengths = parsed.strengthExamples || []
      const weaknesses = parsed.weaknessExamples || []

      let reasoning = `Score: ${parsed.totalScore}/100.`
      if (strengths.length > 0) {
        reasoning += ` Strengths: ${strengths.slice(0, 2).join('; ')}.`
      }
      if (weaknesses.length > 0) {
        reasoning += ` Gaps: ${weaknesses.slice(0, 2).join('; ')}.`
      }

      return {
        score: parsed.totalScore / 100,
        reasoning,
        metadata: {
          dimensions: {
            understandingDepth: parsed.understandingDepth,
            multiFacetedConsideration: parsed.multiFacetedConsideration,
            logicalStructure: parsed.logicalStructure,
            evidenceGrounding: parsed.evidenceGrounding,
            decisionJustification: parsed.decisionJustification,
          },
          strengths,
          weaknesses,
        },
      }
    } catch (error) {
      // Fall back to heuristic
      return reasoningDepthHeuristic.evaluate({ input: {}, output })
    }
  },
}
