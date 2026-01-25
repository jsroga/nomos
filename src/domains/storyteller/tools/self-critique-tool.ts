/**
 * Self-Critique Tool
 *
 * Allows agents to evaluate their own output against GRRM/Gilligan standards
 * before finalizing. This implements the "think tool" pattern from Claude Code.
 *
 * Usage: Agent generates draft → calls self_critique → receives feedback → revises if needed
 */

import { tool } from '@langchain/core/tools'
import { z } from 'zod'
import { ChatAnthropic } from '@langchain/anthropic'
import { SELF_CRITIQUE_PROMPT, GRRM_GILLIGAN_STANDARDS } from '../prompts/extended-thinking'

// ============================================
// TYPES
// ============================================

export interface SelfCritiqueResult {
  overallScore: number
  passes: {
    grrmTest: { passed: boolean; issues: string[] }
    gilliganTest: { passed: boolean; issues: string[] }
    antiSlopCheck: { passed: boolean; violations: string[] }
  }
  specificIssues: Array<{
    location: string
    problem: string
    suggestion: string
  }>
  whatWorksWell: string[]
  mustFix: string[]
  shouldRevise: boolean
  revisionGuidance: string
}

// ============================================
// SELF-CRITIQUE TOOL
// ============================================

export const selfCritiqueTool = tool(
  async ({
    draft,
    context,
    minScoreThreshold = 60,
  }: {
    draft: string
    context?: string
    minScoreThreshold?: number
  }): Promise<SelfCritiqueResult> => {
    try {
      const model = new ChatAnthropic({
        modelName: 'claude-opus-4-5-20251101',
        temperature: 0.2, // Low temp for consistent critique
        maxRetries: 2,
      })

      const prompt = SELF_CRITIQUE_PROMPT
        .replace('{{draft}}', draft)
        .replace('{{context}}', context || 'No additional context provided.')

      const response = await model.invoke(prompt)
      const content = typeof response.content === 'string' ? response.content : JSON.stringify(response.content)

      // Parse JSON response
      const jsonMatch = content.match(/\{[\s\S]*\}/)
      if (!jsonMatch) {
        throw new Error('Failed to parse critique response')
      }

      const result = JSON.parse(jsonMatch[0]) as SelfCritiqueResult

      // Override shouldRevise based on threshold
      result.shouldRevise = result.overallScore < minScoreThreshold

      return result
    } catch (error) {
      console.error('Self-critique failed:', error)

      // Return a safe default that allows continuation
      return {
        overallScore: 50,
        passes: {
          grrmTest: { passed: false, issues: ['Critique failed - unable to evaluate'] },
          gilliganTest: { passed: false, issues: ['Critique failed - unable to evaluate'] },
          antiSlopCheck: { passed: true, violations: [] },
        },
        specificIssues: [],
        whatWorksWell: [],
        mustFix: [],
        shouldRevise: false, // Don't block on critique failure
        revisionGuidance: 'Critique evaluation failed. Proceeding with original draft.',
      }
    }
  },
  {
    name: 'self_critique',
    description:
      'Evaluate your draft against GRRM/Gilligan prestige TV standards. Use this BEFORE finalizing any creative output to catch quality issues.',
    schema: z.object({
      draft: z.string().describe('The draft content to critique'),
      context: z.string().optional().describe('Additional context about what this content should achieve'),
      minScoreThreshold: z
        .number()
        .optional()
        .default(60)
        .describe('Minimum score (0-100) required to pass. Default 60.'),
    }),
  }
)

// ============================================
// QUICK CRITIQUE (HEURISTIC-ONLY)
// ============================================

/**
 * Fast heuristic critique without LLM call
 * Use for quick checks during iteration
 */
export function quickCritique(content: string): {
  slopScore: number
  issues: string[]
  passed: boolean
} {
  const issues: string[] = []
  let slopCount = 0

  // Generic emotion patterns (from magic-score)
  const slopPatterns = [
    { pattern: /tension was palpable/gi, issue: 'Generic atmosphere: "tension was palpable"' },
    { pattern: /heart (pounded|raced|beat faster)/gi, issue: 'Cliché: heart pounding' },
    { pattern: /eyes (widened|narrowed|filled with tears)/gi, issue: 'Cliché: eyes descriptor' },
    { pattern: /breath (caught|hitched|quickened)/gi, issue: 'Cliché: breath caught' },
    { pattern: /felt a (wave|surge|rush) of/gi, issue: 'Cliché: wave of emotion' },
    { pattern: /couldn't (believe|help|stop)/gi, issue: 'Weak construction: couldn\'t believe' },
    { pattern: /suddenly/gi, issue: 'Weak word: suddenly (show, don\'t tell)' },
    { pattern: /literally/gi, issue: 'Overused intensifier: literally' },
    { pattern: /very (angry|sad|happy|scared)/gi, issue: 'Weak modifier: very + emotion' },
    { pattern: /as you know/gi, issue: 'Exposition dump: "as you know"' },
  ]

  for (const { pattern, issue } of slopPatterns) {
    const matches = content.match(pattern)
    if (matches) {
      slopCount += matches.length
      issues.push(`${issue} (${matches.length}x)`)
    }
  }

  // Check for dialogue attribution variety
  const saidCount = (content.match(/\bsaid\b/gi) || []).length
  const totalDialogue = (content.match(/[""][^""]+[""]/g) || []).length
  if (totalDialogue > 3 && saidCount / totalDialogue > 0.7) {
    issues.push('Low dialogue attribution variety (overusing "said")')
    slopCount += 2
  }

  // Calculate score (inverse of slop count)
  const slopScore = Math.max(0, 100 - slopCount * 10)

  return {
    slopScore,
    issues,
    passed: slopScore >= 60,
  }
}

// ============================================
// EXPORTS
// ============================================

export { GRRM_GILLIGAN_STANDARDS }
