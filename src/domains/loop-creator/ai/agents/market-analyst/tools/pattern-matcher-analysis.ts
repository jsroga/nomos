import { countOccurrences } from '@/shared/data/count-occurrences'
import type { PatternMatch } from '../types'

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

export interface DesignPatternIndicator {
  term: string
  weight: number
}

export interface DesignPatternDefinition {
  name: string
  category: 'loop_structure' | 'feedback' | 'progression' | 'engagement' | 'player_experience'
  description: string
  indicators: DesignPatternIndicator[]
  antiPatterns: string[]
  examples: { game: string; implementation: string }[]
  implementationGuide: string[]
  risks: string[]
  compatibility: string[]
  strengths: string[]
}

export type ScoredPatternMatch = PatternMatch & {
  category: string
  implementationGuide: string[]
  risks: string[]
  compatibleWith: string[]
}

export function buildPatternAnalysisText(input: PatternMatcherInput): string {
  const { mechanics, connections, gameGenre, gameDescription } = input
  return [
    ...mechanics.map(m => `${m.name} ${m.type} ${m.description || ''}`),
    ...(connections || []).map(c => `${c.source} ${c.target} ${c.label || ''}`),
    gameGenre || '',
    gameDescription || '',
  ]
    .join(' ')
    .toLowerCase()
}

function scorePatternApplicability(normalizedScore: number, patternName: string): string {
  if (normalizedScore >= 60) {
    return `Strong match - ${patternName} is well represented in this design`
  }
  if (normalizedScore >= 35) {
    return `Moderate match - Elements of ${patternName} present but could be strengthened`
  }
  return `Weak match - Some indicators of ${patternName} detected`
}

export function scoreDesignPatterns(
  patterns: DesignPatternDefinition[],
  allText: string,
): ScoredPatternMatch[] {
  const matches: ScoredPatternMatch[] = []

  for (const pattern of patterns) {
    let score = 0
    const matchedIndicators: string[] = []

    for (const indicator of pattern.indicators) {
      if (allText.includes(indicator.term.toLowerCase())) {
        score += indicator.weight
        matchedIndicators.push(indicator.term)
      }
    }

    for (const anti of pattern.antiPatterns) {
      const antiWords = anti.toLowerCase().split(' ')
      if (antiWords.some(word => word.length > 4 && allText.includes(word))) {
        score -= 2
      }
    }

    const maxPossibleScore = pattern.indicators.reduce((sum, indicator) => sum + indicator.weight, 0)
    const normalizedScore = Math.min(
      100,
      Math.max(0, Math.round((score / maxPossibleScore) * 100)),
    )

    if (normalizedScore > 15 || matchedIndicators.length >= 2) {
      matches.push({
        patternName: pattern.name,
        matchScore: normalizedScore,
        description: pattern.description,
        examples: pattern.examples.map(example => example.game),
        applicability: scorePatternApplicability(normalizedScore, pattern.name),
        category: pattern.category,
        implementationGuide: pattern.implementationGuide,
        risks: pattern.risks,
        compatibleWith: pattern.compatibility,
      })
    }
  }

  return matches.sort((a, b) => b.matchScore - a.matchScore)
}

export function findSuggestedPatterns(
  patterns: DesignPatternDefinition[],
  gameGenre: string | undefined,
  matches: ScoredPatternMatch[],
) {
  const matchedPatternNames = new Set(matches.map(match => match.patternName))

  return patterns
    .filter(pattern => !matchedPatternNames.has(pattern.name))
    .map(pattern => {
      let relevance = 0
      if (gameGenre) {
        const genreLower = gameGenre.toLowerCase()
        if (genreLower.includes('roguelike') && pattern.name.includes('Roguelike')) relevance += 30
        if (
          genreLower.includes('survivor') &&
          (pattern.name.includes('Power') || pattern.name.includes('Dopamine'))
        ) {
          relevance += 30
        }
        if (genreLower.includes('competitive') && pattern.name.includes('Skill')) relevance += 30
      }
      for (const match of matches.slice(0, 3)) {
        if (match.compatibleWith.includes(pattern.name)) relevance += 15
      }
      return { pattern, relevance }
    })
    .sort((a, b) => b.relevance - a.relevance)
    .slice(0, 4)
    .map(({ pattern }) => ({
      patternName: pattern.name,
      category: pattern.category,
      description: pattern.description,
      whyConsider: `Could add: ${pattern.strengths.join(', ')}`,
      implementationHints: pattern.implementationGuide.slice(0, 2),
      examples: pattern.examples.map(example => `${example.game}: ${example.implementation}`).slice(0, 1),
    }))
}

export function buildPatternCompatibility(topPatterns: ScoredPatternMatch[]): string[] {
  const compatibilityAnalysis: string[] = []

  for (let i = 0; i < topPatterns.length; i++) {
    for (let j = i + 1; j < topPatterns.length; j++) {
      const first = topPatterns[i]
      const second = topPatterns[j]
      if (first.compatibleWith.includes(second.patternName)) {
        compatibilityAnalysis.push(`✅ ${first.patternName} + ${second.patternName} synergize well`)
      }
    }
  }

  return compatibilityAnalysis
}

export function buildPatternInsights(matches: ScoredPatternMatch[]): string[] {
  const insights: string[] = []
  const strongMatches = matches.filter(match => match.matchScore >= 60)

  if (strongMatches.length >= 3) {
    insights.push('🎯 Design has strong pattern foundation - focus on polish')
  } else if (strongMatches.length === 0 && matches.length > 0) {
    insights.push('💡 Patterns detected but weak - consider deepening implementation')
  }

  const categories = new Set(matches.map(match => match.category))
  if (!categories.has('loop_structure') && matches.length > 0) {
    insights.push('⚠️ Missing clear loop structure patterns - define core/session/meta loops')
  }
  if (!categories.has('feedback') && matches.length > 0) {
    insights.push('⚠️ Weak feedback patterns - add dopamine rhythm or skill expression')
  }
  if (categories.has('progression') && categories.has('engagement')) {
    insights.push('✅ Good mix of progression and engagement patterns')
  }

  return insights
}

export function collectTopPatternRisks(matches: ScoredPatternMatch[]): string[] {
  const allRisks = matches.flatMap(match => match.risks)
  const riskCounts = countOccurrences(allRisks)

  return Object.entries(riskCounts)
    .filter(([, count]) => count >= 2)
    .map(([risk]) => risk)
}
