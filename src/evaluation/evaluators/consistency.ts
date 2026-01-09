/**
 * Consistency Evaluator
 * 
 * Evaluates whether agent outputs maintain consistency with:
 * - Series bible (characters, factions, world rules)
 * - Previous story elements
 * - Character knowledge states
 */

import { ChatOpenAI } from '@langchain/openai'
import { CustomEvaluator, EvaluatorInput, EvaluatorResult } from '../types'

const CONSISTENCY_JUDGE_PROMPT = `You are an expert evaluator assessing narrative and story consistency.

## Task
Evaluate whether the OUTPUT maintains consistency with the established context.

## Scoring Criteria (0.0 to 1.0)
- **1.0 (Perfect)**: No inconsistencies, fully aligned with established facts
- **0.8 (Good)**: Minor inconsistencies that don't affect story logic
- **0.6 (Fair)**: Some notable inconsistencies but story remains coherent
- **0.4 (Poor)**: Significant inconsistencies that affect narrative logic
- **0.2 (Very Poor)**: Major contradictions with established elements
- **0.0 (Critical)**: Fundamental violations of established canon

## Consistency Checks
1. **Characters**: Do referenced characters exist? Are their traits consistent?
2. **Locations**: Do locations match established world?
3. **Timeline**: Is temporal logic maintained?
4. **Knowledge**: Do characters know only what they should know?
5. **World Rules**: Are established rules followed?

## ESTABLISHED CONTEXT
{reference}

## OUTPUT TO EVALUATE
{output}

## Instructions
Identify any inconsistencies and score accordingly.

Respond with ONLY valid JSON:
{
  "score": 0.85,
  "reasoning": "Brief explanation",
  "inconsistencies": [
    {"type": "character", "issue": "description", "severity": "minor|major|critical"}
  ],
  "consistentElements": ["list of consistent elements verified"]
}`

export const consistencyEvaluator: CustomEvaluator = {
  name: 'consistency',

  evaluate: async ({ output, reference }: EvaluatorInput): Promise<EvaluatorResult> => {
    if (!reference || Object.keys(reference).length === 0) {
      return {
        score: 1.0,
        reasoning: 'No context provided for consistency check',
        metadata: { skipped: true },
      }
    }

    try {
      const model = new ChatOpenAI({
        modelName: 'gpt-4o-mini',
        temperature: 0,
      })

      const prompt = CONSISTENCY_JUDGE_PROMPT
        .replace('{reference}', JSON.stringify(reference, null, 2))
        .replace('{output}', JSON.stringify(output, null, 2))

      const response = await model.invoke(prompt)
      const content = typeof response.content === 'string'
        ? response.content
        : JSON.stringify(response.content)

      const jsonMatch = content.match(/\{[\s\S]*\}/)
      if (!jsonMatch) {
        throw new Error('Failed to parse judge response as JSON')
      }

      const parsed = JSON.parse(jsonMatch[0])

      return {
        score: Math.max(0, Math.min(1, parsed.score)),
        reasoning: parsed.reasoning,
        metadata: {
          inconsistencies: parsed.inconsistencies,
          consistentElements: parsed.consistentElements,
        },
      }
    } catch (error) {
      console.error('Consistency evaluation error:', error)
      return {
        score: 0,
        reasoning: `Evaluation failed: ${error instanceof Error ? error.message : String(error)}`,
        metadata: { error: true },
      }
    }
  },
}

/**
 * Heuristic consistency checker
 * Checks for entity references without LLM
 */
export const consistencyHeuristic: CustomEvaluator = {
  name: 'consistency-heuristic',

  evaluate: async ({ output, reference }: EvaluatorInput): Promise<EvaluatorResult> => {
    if (!reference || Object.keys(reference).length === 0) {
      return {
        score: 1.0,
        reasoning: 'No context provided',
        metadata: { skipped: true },
      }
    }

    const outputStr = JSON.stringify(output).toLowerCase()
    const issues: string[] = []

    // Extract known entities from reference
    const refStr = JSON.stringify(reference)
    
    // Character names (capitalized words that appear multiple times)
    const characterPattern = /characters?["\s:]+\[([^\]]+)\]/i
    const characterMatch = refStr.match(characterPattern)
    const knownCharacters: string[] = []
    
    if (characterMatch) {
      const charNames = characterMatch[1].match(/"name":\s*"([^"]+)"/g) || []
      charNames.forEach((match) => {
        const name = match.replace(/"name":\s*"/, '').replace(/"$/, '')
        knownCharacters.push(name.toLowerCase())
      })
    }

    // Location names
    const locationPattern = /locations?["\s:]+\[([^\]]+)\]/i
    const locationMatch = refStr.match(locationPattern)
    const knownLocations: string[] = []
    
    if (locationMatch) {
      const locNames = locationMatch[1].match(/"name":\s*"([^"]+)"/g) || []
      locNames.forEach((match) => {
        const name = match.replace(/"name":\s*"/, '').replace(/"$/, '')
        knownLocations.push(name.toLowerCase())
      })
    }

    // Check for potential unknown character references
    const quotedNames = outputStr.match(/"[A-Z][a-z]+"/g) || []
    quotedNames.forEach((name) => {
      const cleanName = name.replace(/"/g, '').toLowerCase()
      if (
        knownCharacters.length > 0 &&
        !knownCharacters.includes(cleanName) &&
        cleanName.length > 2
      ) {
        issues.push(`Potential unknown character: ${cleanName}`)
      }
    })

    // Calculate score based on issues found
    const issueCount = issues.length
    let score = 1.0

    if (issueCount > 0) {
      score = Math.max(0.3, 1 - issueCount * 0.15)
    }

    return {
      score,
      reasoning:
        issues.length > 0
          ? `Found ${issues.length} potential consistency issues`
          : 'No obvious consistency issues detected',
      metadata: {
        issues,
        knownCharacters,
        knownLocations,
      },
    }
  },
}

