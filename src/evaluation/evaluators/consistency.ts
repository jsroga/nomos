/**
 * Consistency Evaluator
 *
 * Evaluates whether agent outputs maintain consistency with:
 * - Series bible (characters, factions, world rules)
 * - Previous story elements
 * - Character knowledge states
 * - Temporal logic and causality
 *
 * Uses Claude Opus 4.5 for high-accuracy evaluation with multi-pass verification.
 */

import { ChatAnthropic } from '@langchain/anthropic'
import { CustomEvaluator, EvaluatorInput, EvaluatorResult } from '../types'

const CONSISTENCY_JUDGE_PROMPT = `You are an expert continuity editor with decades of experience on HBO-level prestige dramas. Your job is to catch EVERY inconsistency - you are the last line of defense against plot holes that would make fans riot.

## Task
Perform a MULTI-PASS consistency audit of the OUTPUT against the established canon.

## Scoring Criteria (0.0 to 1.0)
- **1.0 (Perfect)**: No inconsistencies. Every detail aligns with canon. Continuity-obsessed fans would approve.
- **0.8 (Good)**: Minor details that only sharp-eyed fans would notice. No story logic affected.
- **0.6 (Fair)**: Notable inconsistencies but story structure remains intact.
- **0.4 (Poor)**: Significant contradictions that undermine story logic. Characters acting against established traits.
- **0.2 (Very Poor)**: Major canon violations. "But that character was dead!" level issues.
- **0.0 (Critical)**: Fundamental breaks with established reality. Completely incompatible with canon.

## Multi-Pass Verification Checklist

### Pass 1: ENTITY CONSISTENCY
- Character names spelled correctly?
- Characters that appear are actually in this story?
- No characters mysteriously teleported or appearing where they shouldn't be?
- Character relationships match established dynamics?

### Pass 2: TEMPORAL CONSISTENCY
- Timeline makes sense? (No events before their causes)
- Character ages consistent?
- Day/night, seasons, time references align?
- "Last week" events actually happened last week in story time?

### Pass 3: CAUSAL CONSISTENCY
- Do actions have logical consequences?
- Are cause-effect chains preserved?
- Do decisions follow from character motivations?
- Are there dangling plot threads or forgotten setups?

### Pass 4: CHARACTER KNOWLEDGE CONSISTENCY
- Do characters only know what they SHOULD know?
- No psychic knowledge of off-screen events?
- Secrets remain secret until revealed?
- Information flows logically between characters?

### Pass 5: WORLD RULE ADHERENCE
- Magic/technology systems follow established rules?
- Political/social rules respected?
- Economic realities consistent?
- Physical laws of the world maintained?

## ESTABLISHED CANON (Your Reference Bible)
{reference}

## OUTPUT TO EVALUATE
{output}

## Instructions
Run ALL FIVE verification passes. Document every inconsistency found. Be thorough but fair - minor stylistic variations are not inconsistencies.

Respond with ONLY valid JSON:
{
  "score": 0.85,
  "reasoning": "Executive summary of consistency status",
  "passResults": {
    "entityConsistency": {"passed": true, "issues": []},
    "temporalConsistency": {"passed": true, "issues": []},
    "causalConsistency": {"passed": false, "issues": ["description"]},
    "characterKnowledge": {"passed": true, "issues": []},
    "worldRuleAdherence": {"passed": true, "issues": []}
  },
  "inconsistencies": [
    {"type": "entity|temporal|causal|knowledge|world_rule", "issue": "description", "severity": "minor|major|critical", "quote": "offending text if applicable"}
  ],
  "consistentElements": ["list of verified consistent elements"],
  "recommendation": "What to fix to achieve perfect consistency"
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
      // Use Claude Opus 4.5 for high-accuracy multi-pass consistency evaluation
      const model = new ChatAnthropic({
        modelName: 'claude-opus-4-5-20251101',
        temperature: 0, // Zero temperature for maximum consistency in evaluation
        maxRetries: 2,
      })

      const prompt = CONSISTENCY_JUDGE_PROMPT.replace(
        '{reference}',
        JSON.stringify(reference, null, 2)
      ).replace('{output}', JSON.stringify(output, null, 2))

      const response = await model.invoke(prompt)
      const content =
        typeof response.content === 'string' ? response.content : JSON.stringify(response.content)

      const jsonMatch = content.match(/\{[\s\S]*\}/)
      if (!jsonMatch) {
        throw new Error('Failed to parse judge response as JSON')
      }

      const parsed = JSON.parse(jsonMatch[0])

      // Count critical issues for severity assessment
      const criticalCount = (parsed.inconsistencies || []).filter(
        (i: any) => i.severity === 'critical'
      ).length
      const majorCount = (parsed.inconsistencies || []).filter(
        (i: any) => i.severity === 'major'
      ).length

      return {
        score: Math.max(0, Math.min(1, parsed.score)),
        reasoning: parsed.reasoning,
        metadata: {
          passResults: parsed.passResults,
          inconsistencies: parsed.inconsistencies,
          consistentElements: parsed.consistentElements,
          recommendation: parsed.recommendation,
          criticalIssues: criticalCount,
          majorIssues: majorCount,
          evaluatedBy: 'claude-opus-4-5-20251101',
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
      charNames.forEach(match => {
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
      locNames.forEach(match => {
        const name = match.replace(/"name":\s*"/, '').replace(/"$/, '')
        knownLocations.push(name.toLowerCase())
      })
    }

    // Check for potential unknown character references
    const quotedNames = outputStr.match(/"[A-Z][a-z]+"/g) || []
    quotedNames.forEach(name => {
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
