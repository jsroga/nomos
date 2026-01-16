/**
 * RAG Grounding Evaluator
 *
 * Evaluates whether agent outputs properly cite and ground their responses
 * in retrieved source documents.
 *
 * Uses LLM-as-judge pattern to assess:
 * - Citation accuracy
 * - Grounding quality
 * - Source attribution
 */

import { ChatOpenAI } from '@langchain/openai'
import { CustomEvaluator, EvaluatorInput, EvaluatorResult } from '../types'

const GROUNDING_JUDGE_PROMPT = `You are an expert evaluator assessing whether AI-generated content is properly grounded in source documents.

## Task
Evaluate how well the OUTPUT is grounded in and cites the REFERENCE documents.

## Scoring Criteria (0.0 to 1.0)
- **1.0 (Excellent)**: All claims are directly supported by sources, proper citations present
- **0.8 (Good)**: Most claims supported, minor uncited statements that are reasonable inferences
- **0.6 (Fair)**: Some claims supported, but notable gaps in citation or grounding
- **0.4 (Poor)**: Few citations, significant claims without source support
- **0.2 (Very Poor)**: Minimal grounding, mostly unsupported claims
- **0.0 (None)**: No grounding, completely fabricated or contradicts sources

## INPUT (User Request)
{input}

## REFERENCE (Source Documents/Context)
{reference}

## OUTPUT (Agent Response)
{output}

## Instructions
1. Identify all factual claims in the OUTPUT
2. Check each claim against the REFERENCE
3. Note any citations present
4. Score the overall grounding quality

Respond with ONLY valid JSON:
{
  "score": 0.8,
  "reasoning": "Brief explanation of your scoring",
  "groundedClaims": ["list", "of", "grounded", "claims"],
  "ungroundedClaims": ["list", "of", "ungrounded", "claims"],
  "citationsFound": 3,
  "citationsExpected": 5
}`

export const ragGroundingEvaluator: CustomEvaluator = {
  name: 'rag-grounding',

  evaluate: async ({ input, output, reference }: EvaluatorInput): Promise<EvaluatorResult> => {
    // If no reference provided, skip evaluation
    if (!reference || Object.keys(reference).length === 0) {
      return {
        score: 1.0,
        reasoning: 'No reference documents provided - skipping grounding evaluation',
        metadata: { skipped: true },
      }
    }

    try {
      const model = new ChatOpenAI({
        modelName: 'gpt-4o-mini',
        temperature: 0,
      })

      const prompt = GROUNDING_JUDGE_PROMPT.replace('{input}', JSON.stringify(input, null, 2))
        .replace('{reference}', JSON.stringify(reference, null, 2))
        .replace('{output}', JSON.stringify(output, null, 2))

      const response = await model.invoke(prompt)
      const content =
        typeof response.content === 'string' ? response.content : JSON.stringify(response.content)

      // Parse JSON response
      const jsonMatch = content.match(/\{[\s\S]*\}/)
      if (!jsonMatch) {
        throw new Error('Failed to parse judge response as JSON')
      }

      const parsed = JSON.parse(jsonMatch[0])

      return {
        score: Math.max(0, Math.min(1, parsed.score)),
        reasoning: parsed.reasoning,
        metadata: {
          groundedClaims: parsed.groundedClaims,
          ungroundedClaims: parsed.ungroundedClaims,
          citationsFound: parsed.citationsFound,
          citationsExpected: parsed.citationsExpected,
        },
      }
    } catch (error) {
      console.error('RAG grounding evaluation error:', error)
      return {
        score: 0,
        reasoning: `Evaluation failed: ${error instanceof Error ? error.message : String(error)}`,
        metadata: { error: true },
      }
    }
  },
}

/**
 * Heuristic version that doesn't require LLM call
 * Checks for citation patterns in the output
 */
export const ragGroundingHeuristic: CustomEvaluator = {
  name: 'rag-grounding-heuristic',

  evaluate: async ({ output, reference }: EvaluatorInput): Promise<EvaluatorResult> => {
    if (!reference || Object.keys(reference).length === 0) {
      return {
        score: 1.0,
        reasoning: 'No reference documents provided',
        metadata: { skipped: true },
      }
    }

    const outputStr = JSON.stringify(output)
    const referenceStr = JSON.stringify(reference)

    // Check for citation patterns
    const citationPatterns = [
      /\[source[:\s]/i,
      /\[ref[:\s]/i,
      /according to/i,
      /based on/i,
      /from the/i,
      /\(cite/i,
      /series bible/i,
      /world rules/i,
    ]

    const citationsFound = citationPatterns.filter(p => p.test(outputStr)).length

    // Check if key terms from reference appear in output
    const referenceTerms = referenceStr.toLowerCase().match(/\b[a-z]{4,}\b/g) || []
    const uniqueTerms = Array.from(new Set(referenceTerms))
    const outputLower = outputStr.toLowerCase()

    const termsUsed = uniqueTerms.filter(term => outputLower.includes(term)).length
    const termCoverage = uniqueTerms.length > 0 ? termsUsed / uniqueTerms.length : 0

    // Calculate score
    const citationScore = Math.min(citationsFound / 3, 1) * 0.4
    const coverageScore = termCoverage * 0.6
    const score = citationScore + coverageScore

    return {
      score: Math.max(0, Math.min(1, score)),
      reasoning: `Found ${citationsFound} citation patterns, ${Math.round(termCoverage * 100)}% term coverage`,
      metadata: {
        citationsFound,
        termCoverage,
        uniqueTermsChecked: uniqueTerms.length,
        termsUsed,
      },
    }
  },
}
