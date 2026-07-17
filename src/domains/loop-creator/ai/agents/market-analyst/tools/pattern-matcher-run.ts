import {
  buildPatternAnalysisText,
  buildPatternCompatibility,
  buildPatternInsights,
  collectTopPatternRisks,
  findSuggestedPatterns,
  scoreDesignPatterns,
  type ScoredPatternMatch,
} from './pattern-matcher-analysis'
import { DESIGN_PATTERNS } from './pattern-matcher-data'

export interface PatternMatcherInput {
  mechanics: Array<{
    name: string
    type: string
    description?: string
  }>
  connections?: Array<{
    source: string
    target: string
    label?: string
  }>
  gameGenre?: string
  gameDescription?: string
}

function summarizePatternMatches(matches: ScoredPatternMatch[]) {
  return matches.reduce(
    (summary, match) => {
      if (match.matchScore >= 60) {
        summary.strongMatches += 1
      } else if (match.matchScore >= 35) {
        summary.moderateMatches += 1
      } else {
        summary.weakMatches += 1
      }

      summary.categories.add(match.category)
      return summary
    },
    {
      strongMatches: 0,
      moderateMatches: 0,
      weakMatches: 0,
      categories: new Set<string>(),
    },
  )
}

function buildOverallAssessment(matches: ScoredPatternMatch[], strongMatches: number) {
  if (matches.length === 0) {
    return 'No strong pattern matches found. Consider implementing core design patterns starting with Core Loop Trinity.'
  }

  if (strongMatches >= 2) {
    const patternNames = matches
      .filter(match => match.matchScore >= 60)
      .map(match => match.patternName)
      .join(', ')

    return `Strong design foundation with ${strongMatches} well-implemented patterns. Focus on: ${patternNames}`
  }

  return `Developing design with ${matches.length} detected patterns. Strengthen: ${matches
    .slice(0, 2)
    .map(match => match.patternName)
    .join(', ')}`
}

export function analyzePatternMatches(input: PatternMatcherInput) {
  const allText = buildPatternAnalysisText(input)
  const matches = scoreDesignPatterns(DESIGN_PATTERNS, allText)
  const suggestedPatterns = findSuggestedPatterns(DESIGN_PATTERNS, input.gameGenre, matches)
  const topPatterns = matches.slice(0, 3)
  const compatibilityAnalysis = buildPatternCompatibility(topPatterns)
  const insights = buildPatternInsights(matches)
  const topRisks = collectTopPatternRisks(matches).slice(0, 3)
  const summary = summarizePatternMatches(matches)

  return {
    success: true as const,
    matchedPatterns: matches.map(match => ({
      patternName: match.patternName,
      category: match.category,
      matchScore: match.matchScore,
      description: match.description,
      applicability: match.applicability,
      examples: match.examples,
      implementationGuide: match.implementationGuide,
      risks: match.risks,
    })),
    patternSummary: {
      strongMatches: summary.strongMatches,
      moderateMatches: summary.moderateMatches,
      weakMatches: summary.weakMatches,
      categoriesCovered: Array.from(summary.categories),
    },
    suggestedPatterns,
    compatibilityAnalysis,
    insights,
    topRisks,
    overallAssessment: buildOverallAssessment(matches, summary.strongMatches),
  }
}
