/**
 * Retrieval Relevance Evaluator
 *
 * Evaluates whether RAG retrieval results match the query intent.
 * Uses heuristic and LLM-based approaches.
 */

import { ChatOpenAI } from '@langchain/openai'
import { CustomEvaluator, EvaluatorInput, EvaluatorResult } from '../types'

// ============================================
// HEURISTIC EVALUATOR
// ============================================

/**
 * Fast heuristic-based retrieval relevance check
 *
 * Checks:
 * - Are key terms from the query present in the response?
 * - Is the response substantive (not empty/generic)?
 * - Does it contain domain-specific terms?
 */
export const retrievalRelevanceHeuristic: CustomEvaluator = {
  name: 'retrieval-relevance-heuristic',

  evaluate: async ({ input, output }: EvaluatorInput): Promise<EvaluatorResult> => {
    const query = typeof input.message === 'string' ? input.message : ''
    const response =
      typeof output === 'string' ? output : (output as any).response || JSON.stringify(output)

    if (!query || !response) {
      return {
        score: 0,
        reasoning: 'Missing query or response',
        metadata: { error: true },
      }
    }

    let score = 1.0
    const issues: string[] = []
    const positives: string[] = []

    // Extract key terms from query (nouns, verbs, entities)
    const queryTerms = extractKeyTerms(query)

    // Check if key query terms appear in response
    const termCoverage = calculateTermCoverage(queryTerms, response)

    if (termCoverage < 0.3) {
      score -= 0.3
      issues.push(`Low term coverage: ${(termCoverage * 100).toFixed(0)}% of query terms found`)
    } else if (termCoverage >= 0.6) {
      positives.push(`Good term coverage: ${(termCoverage * 100).toFixed(0)}%`)
    }

    // Check response length (too short = likely not retrieved)
    if (response.length < 100) {
      score -= 0.2
      issues.push('Response too short for substantive retrieval')
    }

    // Check for generic non-answers
    const GENERIC_PATTERNS = [
      /i don't have (enough )?information/i,
      /i cannot (find|locate|retrieve)/i,
      /no relevant (documents?|information|data)/i,
      /not (found|available) in/i,
      /outside (of )?my knowledge/i,
    ]

    for (const pattern of GENERIC_PATTERNS) {
      if (pattern.test(response)) {
        score -= 0.3
        issues.push('Response indicates retrieval failure')
        break
      }
    }

    // Check for domain-specific terms (storytelling domain)
    const DOMAIN_TERMS = [
      'character',
      'plot',
      'scene',
      'episode',
      'dialogue',
      'story',
      'arc',
      'beat',
      'act',
      'conflict',
      'theme',
      'protagonist',
      'antagonist',
      'setting',
      'motivation',
      'series',
      'bible',
      'script',
      'pilot',
      'season',
    ]

    const domainTermCount = DOMAIN_TERMS.filter(term =>
      response.toLowerCase().includes(term)
    ).length

    if (domainTermCount >= 3) {
      positives.push(`Contains ${domainTermCount} domain terms`)
    } else if (domainTermCount === 0) {
      score -= 0.1
      issues.push('No domain-specific terms found')
    }

    // Check for citations (indicates RAG grounding)
    const citationPatterns = [
      /\[source[:\s]/i,
      /according to/i,
      /from the (series )?bible/i,
      /as (established|mentioned|noted) in/i,
      /\bep(isode)?\s*\d/i,
    ]

    const hasCitations = citationPatterns.some(p => p.test(response))
    if (hasCitations) {
      positives.push('Contains citations/references')
    }

    // Ensure score is in valid range
    score = Math.max(0, Math.min(1, score))

    const reasoning =
      issues.length > 0
        ? `Retrieval issues: ${issues.join('; ')}`
        : positives.length > 0
          ? `Good retrieval: ${positives.join('; ')}`
          : 'Acceptable retrieval quality'

    return {
      score,
      reasoning,
      metadata: {
        queryTerms,
        termCoverage,
        domainTermCount,
        hasCitations,
        issues,
        positives,
      },
    }
  },
}

// ============================================
// LLM EVALUATOR
// ============================================

const RELEVANCE_JUDGE_PROMPT = `You are evaluating whether a RAG system retrieved and used relevant information to answer a query.

## Query
{query}

## Response
{response}

## Evaluation Criteria

### 1. Query Understanding (0-25 points)
- Did the system correctly understand what the user was asking?
- Are the key concepts from the query addressed?

### 2. Information Relevance (0-25 points)
- Is the retrieved information directly relevant to the query?
- Or is it tangential/unrelated content?

### 3. Completeness (0-25 points)
- Does the response cover the main aspects of the query?
- Are there obvious gaps that should have been filled?

### 4. Grounding Quality (0-25 points)
- Is the response clearly grounded in specific retrieved content?
- Or does it seem generic/made up?

Respond with JSON only:
{
  "queryUnderstanding": { "score": 0-25, "reasoning": "..." },
  "informationRelevance": { "score": 0-25, "reasoning": "..." },
  "completeness": { "score": 0-25, "reasoning": "..." },
  "groundingQuality": { "score": 0-25, "reasoning": "..." },
  "totalScore": 0-100,
  "summary": "One sentence summary"
}`

export const retrievalRelevanceEvaluator: CustomEvaluator = {
  name: 'retrieval-relevance',

  evaluate: async ({ input, output }: EvaluatorInput): Promise<EvaluatorResult> => {
    const query = typeof input.message === 'string' ? input.message : ''
    const response =
      typeof output === 'string' ? output : (output as any).response || JSON.stringify(output)

    if (!query || !response) {
      return {
        score: 0,
        reasoning: 'Missing query or response',
        metadata: { error: true },
      }
    }

    try {
      const model = new ChatOpenAI({
        modelName: 'gpt-4o-mini',
        temperature: 0,
      })

      const prompt = RELEVANCE_JUDGE_PROMPT.replace('{query}', query).replace(
        '{response}',
        response.slice(0, 4000)
      )

      const result = await model.invoke(prompt)
      const responseText =
        typeof result.content === 'string' ? result.content : JSON.stringify(result.content)

      const jsonMatch = responseText.match(/\{[\s\S]*\}/)
      if (!jsonMatch) {
        throw new Error('No JSON in response')
      }

      const parsed = JSON.parse(jsonMatch[0])

      return {
        score: parsed.totalScore / 100,
        reasoning: parsed.summary || 'LLM evaluation complete',
        metadata: {
          queryUnderstanding: parsed.queryUnderstanding,
          informationRelevance: parsed.informationRelevance,
          completeness: parsed.completeness,
          groundingQuality: parsed.groundingQuality,
        },
      }
    } catch (error) {
      // Fall back to heuristic
      return retrievalRelevanceHeuristic.evaluate({ input, output })
    }
  },
}

// ============================================
// HELPER FUNCTIONS
// ============================================

function extractKeyTerms(text: string): string[] {
  // Remove common stop words and extract meaningful terms
  const STOP_WORDS = new Set([
    'a',
    'an',
    'the',
    'is',
    'are',
    'was',
    'were',
    'be',
    'been',
    'being',
    'have',
    'has',
    'had',
    'do',
    'does',
    'did',
    'will',
    'would',
    'could',
    'should',
    'may',
    'might',
    'can',
    'this',
    'that',
    'these',
    'those',
    'i',
    'you',
    'he',
    'she',
    'it',
    'we',
    'they',
    'what',
    'which',
    'who',
    'when',
    'where',
    'why',
    'how',
    'all',
    'each',
    'every',
    'both',
    'few',
    'more',
    'most',
    'other',
    'some',
    'such',
    'no',
    'not',
    'only',
    'own',
    'same',
    'so',
    'than',
    'too',
    'very',
    'just',
    'also',
    'now',
    'here',
    'there',
    'about',
    'after',
    'again',
    'against',
    'before',
    'between',
    'into',
    'through',
    'during',
    'above',
    'below',
    'to',
    'from',
    'up',
    'down',
    'in',
    'out',
    'on',
    'off',
    'over',
    'under',
    'further',
    'then',
    'once',
    'and',
    'but',
    'or',
    'nor',
    'for',
    'yet',
    'as',
    'at',
    'by',
    'with',
    'me',
    'my',
    'tell',
    'show',
    'give',
    'let',
    'make',
    'get',
  ])

  const words = text
    .toLowerCase()
    .replace(/[^a-z\s]/g, ' ')
    .split(/\s+/)
    .filter(w => w.length > 2 && !STOP_WORDS.has(w))

  // Return unique terms
  return [...new Set(words)]
}

function calculateTermCoverage(queryTerms: string[], response: string): number {
  if (queryTerms.length === 0) return 1

  const responseLower = response.toLowerCase()
  const matchedTerms = queryTerms.filter(term => responseLower.includes(term))

  return matchedTerms.length / queryTerms.length
}
