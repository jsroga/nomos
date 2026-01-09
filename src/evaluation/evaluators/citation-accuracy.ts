/**
 * Citation Accuracy Evaluator
 * 
 * Verifies that citations in generated content:
 * 1. Actually exist (not fabricated)
 * 2. Support the claims being made
 * 3. Are semantically related to the context
 */

import { ChatOpenAI } from '@langchain/openai'
import { CustomEvaluator, EvaluatorInput, EvaluatorResult } from '../types'

// ============================================
// TYPES
// ============================================

interface Citation {
  text: string
  source: string
  claim: string
}

interface CitationValidation {
  citation: Citation
  exists: boolean
  supportsClain: boolean
  confidence: number
  issue?: string
}

// ============================================
// CITATION EXTRACTION
// ============================================

/**
 * Extract citations from text using pattern matching
 */
function extractCitations(text: string): Citation[] {
  const citations: Citation[] = []
  
  // Pattern 1: [Source: X] or [Source X]
  const sourcePattern = /\[source[:\s]+([^\]]+)\]/gi
  let match
  while ((match = sourcePattern.exec(text)) !== null) {
    const context = getContextAround(text, match.index, 200)
    citations.push({
      text: match[0],
      source: match[1].trim(),
      claim: context,
    })
  }
  
  // Pattern 2: "According to X" or "As mentioned in X"
  const accordingPattern = /(?:according to|as (?:mentioned|noted|stated) in|from the)\s+(.+?)(?:,|\.|:)/gi
  while ((match = accordingPattern.exec(text)) !== null) {
    const context = getContextAround(text, match.index, 200)
    citations.push({
      text: match[0],
      source: match[1].trim(),
      claim: context,
    })
  }
  
  // Pattern 3: "Episode X" or "Ep. X" references
  const episodePattern = /(?:episode|ep\.?)\s*(\d+)/gi
  while ((match = episodePattern.exec(text)) !== null) {
    const context = getContextAround(text, match.index, 200)
    citations.push({
      text: match[0],
      source: `Episode ${match[1]}`,
      claim: context,
    })
  }
  
  // Pattern 4: "In the series bible" or "According to the bible"
  const biblePattern = /(?:in the|from the|according to the)\s*(?:series\s*)?bible/gi
  while ((match = biblePattern.exec(text)) !== null) {
    const context = getContextAround(text, match.index, 200)
    citations.push({
      text: match[0],
      source: 'series bible',
      claim: context,
    })
  }
  
  return citations
}

/**
 * Get context around a position in text
 */
function getContextAround(text: string, position: number, windowSize: number): string {
  const start = Math.max(0, position - windowSize / 2)
  const end = Math.min(text.length, position + windowSize / 2)
  return text.slice(start, end).trim()
}

// ============================================
// HEURISTIC VALIDATOR
// ============================================

/**
 * Fast heuristic-based citation validation
 */
function validateCitationHeuristic(citation: Citation, fullText: string): CitationValidation {
  // Check if the source reference looks valid (not obviously fabricated)
  const sourcePatterns = {
    episode: /^episode\s*\d+$/i,
    bible: /^(?:series\s*)?bible$/i,
    character: /^\w+(?:\s+\w+)?$/,  // Character names
    generic: /.+/,  // Anything
  }
  
  let exists = true
  let supportsClain = true
  let confidence = 0.7
  let issue: string | undefined
  
  // Check for suspicious patterns indicating fabrication
  const SUSPICIOUS_PATTERNS = [
    /chapter\s*\d+\.\d+/i,  // Over-specific chapter numbers
    /page\s*\d{3,}/i,  // Large page numbers
    /section\s*[A-Z]\d{2,}/i,  // Corporate-style section numbers
    /reference\s*#?\d{5,}/i,  // Long reference numbers
    /\d{4}-\d{2}-\d{2}/,  // Dates (likely hallucinated)
    /https?:\/\/[^\s]+/,  // URLs (often fabricated)
  ]
  
  for (const pattern of SUSPICIOUS_PATTERNS) {
    if (pattern.test(citation.source)) {
      exists = false
      confidence = 0.3
      issue = `Suspicious source pattern: ${citation.source}`
      break
    }
  }
  
  // Check if claim seems supported (very basic heuristic)
  // Look for conditional language that might indicate uncertainty
  const UNCERTAINTY_MARKERS = [
    /might\s+(?:have\s+)?been/i,
    /possibly/i,
    /presumably/i,
    /it's\s+unclear/i,
    /not\s+(?:entirely\s+)?sure/i,
  ]
  
  for (const pattern of UNCERTAINTY_MARKERS) {
    if (pattern.test(citation.claim)) {
      supportsClain = false
      confidence *= 0.8
      issue = 'Citation used with uncertain language'
      break
    }
  }
  
  return {
    citation,
    exists,
    supportsClain,
    confidence,
    issue,
  }
}

// ============================================
// LLM VALIDATOR
// ============================================

const CITATION_JUDGE_PROMPT = `You are verifying if citations in generated text are valid and accurate.

## Text with Citations
{text}

## Extracted Citation
Source: {source}
Context: {context}

## Verification Tasks

1. **Source Existence**: Does this source reference seem legitimate?
   - Real sources: "Episode 3", "series bible", character names, scene references
   - Fabricated: specific URLs, ISBN numbers, exact page numbers, dates

2. **Claim Support**: Does the cited context actually support the claim being made?
   - Is there a logical connection?
   - Is the claim consistent with typical storytelling knowledge?

3. **Fabrication Signals**: Are there signs this was hallucinated?
   - Over-specific details (exact timestamps, page numbers)
   - Made-up URLs or references
   - Information that couldn't exist in a story bible

Respond with JSON only:
{
  "sourceExists": true/false,
  "existenceReasoning": "...",
  "supportsClaim": true/false,
  "supportReasoning": "...",
  "fabricationRisk": "low/medium/high",
  "fabricationSignals": ["list of red flags"],
  "overallScore": 0-100,
  "summary": "one sentence"
}`

async function validateCitationLLM(
  citation: Citation,
  fullText: string
): Promise<CitationValidation> {
  try {
    const model = new ChatOpenAI({
      modelName: 'gpt-4o-mini',
      temperature: 0,
    })
    
    const prompt = CITATION_JUDGE_PROMPT
      .replace('{text}', fullText.slice(0, 3000))
      .replace('{source}', citation.source)
      .replace('{context}', citation.claim)
    
    const response = await model.invoke(prompt)
    const responseText = typeof response.content === 'string' 
      ? response.content 
      : JSON.stringify(response.content)
    
    const jsonMatch = responseText.match(/\{[\s\S]*\}/)
    if (!jsonMatch) {
      throw new Error('No JSON in response')
    }
    
    const parsed = JSON.parse(jsonMatch[0])
    
    return {
      citation,
      exists: parsed.sourceExists,
      supportsClain: parsed.supportsClaim,
      confidence: parsed.overallScore / 100,
      issue: parsed.fabricationRisk === 'high' 
        ? `High fabrication risk: ${parsed.fabricationSignals?.join(', ')}` 
        : undefined,
    }
  } catch (error) {
    return validateCitationHeuristic(citation, fullText)
  }
}

// ============================================
// EVALUATORS
// ============================================

/**
 * Heuristic citation accuracy evaluator
 */
export const citationAccuracyHeuristic: CustomEvaluator = {
  name: 'citation-accuracy-heuristic',
  
  evaluate: async ({ output }: EvaluatorInput): Promise<EvaluatorResult> => {
    const text = typeof output === 'string' 
      ? output 
      : (output as any).response || JSON.stringify(output)
    
    const citations = extractCitations(text)
    
    if (citations.length === 0) {
      return {
        score: 1,  // No citations = nothing to validate
        reasoning: 'No citations found in output',
        metadata: { citationCount: 0 },
      }
    }
    
    const validations = citations.map(c => validateCitationHeuristic(c, text))
    
    // Calculate scores
    const existsScore = validations.filter(v => v.exists).length / validations.length
    const supportsScore = validations.filter(v => v.supportsClain).length / validations.length
    const avgConfidence = validations.reduce((sum, v) => sum + v.confidence, 0) / validations.length
    
    const overallScore = (existsScore * 0.4 + supportsScore * 0.4 + avgConfidence * 0.2)
    
    const issues = validations
      .filter(v => v.issue)
      .map(v => v.issue!)
    
    return {
      score: overallScore,
      reasoning: issues.length > 0 
        ? `Citation issues: ${issues.slice(0, 2).join('; ')}`
        : `${citations.length} citations validated (${(overallScore * 100).toFixed(0)}% accuracy)`,
      metadata: {
        citationCount: citations.length,
        validations,
        existsScore,
        supportsScore,
      },
    }
  },
}

/**
 * LLM-powered citation accuracy evaluator
 */
export const citationAccuracyEvaluator: CustomEvaluator = {
  name: 'citation-accuracy',
  
  evaluate: async ({ output }: EvaluatorInput): Promise<EvaluatorResult> => {
    const text = typeof output === 'string' 
      ? output 
      : (output as any).response || JSON.stringify(output)
    
    const citations = extractCitations(text)
    
    if (citations.length === 0) {
      return {
        score: 1,
        reasoning: 'No citations found in output',
        metadata: { citationCount: 0 },
      }
    }
    
    // Validate citations (limit to 5 for performance)
    const citationsToValidate = citations.slice(0, 5)
    const validations = await Promise.all(
      citationsToValidate.map(c => validateCitationLLM(c, text))
    )
    
    // Calculate scores
    const existsScore = validations.filter(v => v.exists).length / validations.length
    const supportsScore = validations.filter(v => v.supportsClain).length / validations.length
    const avgConfidence = validations.reduce((sum, v) => sum + v.confidence, 0) / validations.length
    
    const overallScore = (existsScore * 0.4 + supportsScore * 0.4 + avgConfidence * 0.2)
    
    const issues = validations
      .filter(v => v.issue)
      .map(v => v.issue!)
    
    return {
      score: overallScore,
      reasoning: issues.length > 0 
        ? `Citation issues: ${issues.slice(0, 2).join('; ')}`
        : `${citations.length} citations validated (${(overallScore * 100).toFixed(0)}% accuracy)`,
      metadata: {
        citationCount: citations.length,
        validatedCount: citationsToValidate.length,
        validations,
        existsScore,
        supportsScore,
      },
    }
  },
}

// ============================================
// UTILITY EXPORTS
// ============================================

export { extractCitations, validateCitationHeuristic }

