/**
 * Best Match Archetype Scorer
 */

import { createLoopStructuredTool } from '../structured-tool'
import { mechanicsLoopsWithGenreSchema } from '../mechanics-loops-schema'
import { ARCHETYPES, scoreArchetype } from './best-match-scoring'
import type { ArchetypeMatch, BestMatchResult } from './best-match-types'

export type { ArchetypeId, ArchetypeMatch, BestMatchResult } from './best-match-types'

function buildViability(primaryArchetype: ArchetypeMatch): {
  verdict: BestMatchResult['viabilityVerdict']
  reason: string
} {
  if (primaryArchetype.score >= 70) {
    return {
      verdict: 'strong',
      reason: `Design strongly matches ${primaryArchetype.archetypeName} formula. Clear market fit with proven audience.`,
    }
  }

  if (primaryArchetype.score >= 45) {
    return {
      verdict: 'moderate',
      reason: `Design has ${primaryArchetype.archetypeName} elements but needs enhancement to fully capture that audience.`,
    }
  }

  if (primaryArchetype.score >= 25) {
    return {
      verdict: 'niche',
      reason:
        'Design doesn\'t strongly match any reference archetype. May need unique positioning or hybrid appeal.',
    }
  }

  return {
    verdict: 'unclear',
    reason:
      'Design needs more definition. Consider which archetype you want to target and add relevant patterns.',
  }
}

function buildRecommendation(
  viabilityVerdict: BestMatchResult['viabilityVerdict'],
  primaryArchetype: ArchetypeMatch,
  otherArchetypes: ArchetypeMatch[],
): string {
  if (viabilityVerdict === 'strong') {
    return `Lean into ${primaryArchetype.archetypeName} strengths. Your key patterns: ${primaryArchetype.keyPatterns.slice(0, 3).join(', ')}. Study successful games in this space.`
  }

  if (viabilityVerdict === 'moderate') {
    const topMissing = primaryArchetype.weakPatterns[0] || 'core patterns'
    return `To strengthen ${primaryArchetype.archetypeName} fit, consider adding: ${topMissing}. Or pivot toward ${otherArchetypes[0].archetypeName} if that fits your vision better.`
  }

  return `Define your target: Add ${primaryArchetype.keyPatterns.length > 0 ? primaryArchetype.archetypeName : 'clear'} mechanics, or create a unique hybrid. What player motivation do you serve?`
}

export const bestMatchScorerTool = createLoopStructuredTool({
  name: 'best_match_archetype_scorer',
  description: `Analyze game design against three reference archetypes (Vampire Survivors, Disco Elysium, Counter-Strike) and identify the STRONGEST match.

KEY PRINCIPLE: A loop only needs to excel at ONE archetype to be viable.
- Score 70+ on ANY archetype = strong market fit
- Score 45-69 = moderate fit with improvement potential
- Below 45 = different focus (valid but needs different positioning)

Returns:
- Primary archetype with confidence and key patterns
- Other archetypes for reference
- Viability verdict (strong/moderate/niche/unclear)
- Market positioning recommendation`,
  schema: mechanicsLoopsWithGenreSchema,
  func: async input => {
    const { mechanics, loops, gameDescription, gameGenre } =
      mechanicsLoopsWithGenreSchema.parse(input)
    try {
      const allText = [
        ...mechanics.map(mechanic => `${mechanic.name} ${mechanic.type} ${mechanic.description || ''}`),
        ...(loops || []).map(loop => `${loop.name} ${loop.type} ${loop.description || ''}`),
        gameDescription || '',
        gameGenre || '',
      ]
        .join(' ')
        .toLowerCase()

      const archetypeMatches = ARCHETYPES.map(archetype =>
        scoreArchetype(archetype, allText, mechanics),
      ).sort((left, right) => right.score - left.score)

      const primaryArchetype = archetypeMatches[0]
      const otherArchetypes = archetypeMatches.slice(1)
      const { verdict, reason } = buildViability(primaryArchetype)

      const result: BestMatchResult = {
        success: true,
        primaryArchetype,
        otherArchetypes,
        viabilityVerdict: verdict,
        viabilityReason: reason,
        recommendation: buildRecommendation(verdict, primaryArchetype, otherArchetypes),
      }

      return JSON.stringify({
        ...result,
        summary: {
          bestMatch: primaryArchetype.archetypeName,
          bestScore: primaryArchetype.score,
          verdict,
          keyStrengths: primaryArchetype.keyPatterns.slice(0, 3),
        },
        scoreComparison: archetypeMatches.map(match => ({
          archetype: match.archetypeName,
          score: match.score,
          confidence: Math.round(match.confidence * 100),
          isPrimary: match === primaryArchetype,
        })),
        _analysis: {
          mechanicCount: mechanics.length,
          textLength: allText.length,
          timestamp: new Date().toISOString(),
        },
      })
    } catch (error) {
      return JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Best match analysis failed',
        primaryArchetype: null,
        otherArchetypes: [],
        viabilityVerdict: 'unclear',
        viabilityReason: 'Analysis failed',
        recommendation: 'Retry analysis',
      })
    }
  },
})
