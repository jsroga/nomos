import { countOccurrences } from '@/shared/data/count-occurrences'
import { AUDIENCE_PROFILES, type AudienceProfile } from './audience-analyzer-data'

export interface AudienceScoreResult {
  profile: AudienceProfile
  score: number
  matchedPositives: string[]
  matchedNegatives: string[]
  compatibility: 'Excellent' | 'Good' | 'Moderate' | 'Poor'
}

export interface AudienceAnalysisInput {
  mechanics: Array<{ name: string; type: string; description?: string }>
  targetAudience?: string
  platform?: string
  sessionLength?: string
  gameGenre?: string
  gameDescription?: string
}

function compatibilityLabel(score: number): AudienceScoreResult['compatibility'] {
  if (score >= 70) return 'Excellent'
  if (score >= 50) return 'Good'
  if (score >= 30) return 'Moderate'
  return 'Poor'
}

function applyPlatformAdjustment(profileId: string, platform: string | undefined, score: number): number {
  if (!platform) return score
  const platformLower = platform.toLowerCase()
  if (profileId === 'mobile_commuter' && !platformLower.includes('mobile')) return score - 10
  if (profileId === 'mobile_commuter' && platformLower.includes('mobile')) return score + 10
  if (profileId === 'competitor' && platformLower.includes('pc')) return score + 5
  return score
}

export function buildAudienceAnalysisText(input: AudienceAnalysisInput): string {
  return [
    ...input.mechanics.map(m => `${m.name} ${m.type} ${m.description || ''}`),
    input.gameGenre || '',
    input.gameDescription || '',
    input.platform || '',
  ]
    .join(' ')
    .toLowerCase()
}

export function scoreAudienceProfile(
  profile: AudienceProfile,
  allText: string,
  platform?: string,
): AudienceScoreResult {
  let score = 0
  const matchedPositives: string[] = []
  const matchedNegatives: string[] = []

  for (const indicator of profile.positiveIndicators) {
    if (allText.includes(indicator.term.toLowerCase())) {
      score += indicator.weight
      matchedPositives.push(indicator.term)
    }
  }

  for (const indicator of profile.negativeIndicators) {
    if (allText.includes(indicator.term.toLowerCase())) {
      score += indicator.weight
      matchedNegatives.push(indicator.term)
    }
  }

  score = applyPlatformAdjustment(profile.id, platform, score)

  const maxPossible = profile.positiveIndicators.reduce((sum, indicator) => sum + indicator.weight, 0)
  const normalizedScore = Math.max(
    0,
    Math.min(100, Math.round((score / maxPossible) * 100 + 40)),
  )

  return {
    profile,
    score: normalizedScore,
    matchedPositives,
    matchedNegatives,
    compatibility: compatibilityLabel(normalizedScore),
  }
}

export function scoreAllAudienceProfiles(
  allText: string,
  platform?: string,
): AudienceScoreResult[] {
  return AUDIENCE_PROFILES.map(profile => scoreAudienceProfile(profile, allText, platform)).sort(
    (a, b) => b.score - a.score,
  )
}

export function resolvePrimaryAudience(
  audienceScores: AudienceScoreResult[],
  targetAudience?: string,
): AudienceScoreResult {
  const defaultTarget = audienceScores[0]
  if (!targetAudience || !defaultTarget) return defaultTarget

  return (
    audienceScores.find(
      entry =>
        entry.profile.name.toLowerCase().includes(targetAudience.toLowerCase()) ||
        entry.profile.id.toLowerCase().includes(targetAudience.toLowerCase()),
    ) ?? defaultTarget
  )
}

function emptyAudienceScorePartition(): {
  topAudiences: AudienceScoreResult[]
  poorFits: AudienceScoreResult[]
} {
  return { topAudiences: [], poorFits: [] }
}

export function partitionAudienceScores(scores: AudienceScoreResult[]): {
  topAudiences: AudienceScoreResult[]
  poorFits: AudienceScoreResult[]
} {
  return scores.reduce(
    (acc, entry) => {
      if (entry.score >= 60) acc.topAudiences.push(entry)
      else if (entry.score < 30) acc.poorFits.push(entry)
      return acc
    },
    emptyAudienceScorePartition(),
  )
}

export function buildSessionInsights(
  sessionLength: string | undefined,
  primaryTarget: AudienceScoreResult,
): string[] {
  if (!sessionLength) return []
  const minutes = parseInt(sessionLength, 10)
  if (Number.isNaN(minutes)) return []

  const insights: string[] = []
  if (minutes < 10 && primaryTarget.profile.id !== 'mobile_commuter') {
    insights.push('⚠️ Very short sessions may limit engagement depth')
  }
  if (
    minutes > 60 &&
    ['casual_relaxer', 'mobile_commuter'].includes(primaryTarget.profile.id)
  ) {
    insights.push('⚠️ Long sessions may not fit casual/mobile audience preferences')
  }
  return insights
}

export function buildAudienceInsights(
  topAudiences: AudienceScoreResult[],
): string[] {
  const insights: string[] = []
  if (topAudiences.length >= 2) {
    insights.push(
      `🎯 Design appeals to multiple audiences: ${topAudiences.map(entry => entry.profile.name).join(', ')}`,
    )
  }
  if (topAudiences.length === 0) {
    insights.push('⚠️ No strong audience fit detected - consider sharpening target audience')
  }
  return insights
}

export function buildAudienceAnalyzerPayload(
  input: AudienceAnalysisInput,
  audienceScores: AudienceScoreResult[],
  primaryTarget: AudienceScoreResult,
  topAudiences: AudienceScoreResult[],
  poorFits: AudienceScoreResult[],
) {
  const insights = [
    ...buildAudienceInsights(topAudiences),
    ...buildSessionInsights(input.sessionLength, primaryTarget),
  ]

  const bestMonetization = countOccurrences(
    topAudiences.flatMap(entry => entry.profile.spendingBehavior.preferredModels),
  )
  const recommendedModel = Object.entries(bestMonetization)
    .sort((a, b) => b[1] - a[1])
    .map(([model]) => model)

  const recommendations =
    primaryTarget.score >= 60
      ? primaryTarget.profile.designAdvice.slice(0, 3)
      : [
          'Consider strengthening appeal to your target audience:',
          ...primaryTarget.profile.designAdvice.slice(0, 2),
        ]

  const spendingEstimate =
    topAudiences.length > 0
      ? topAudiences[0].profile.spendingBehavior.averageSpend
      : 'Variable - audience fit unclear'

  return {
    success: true,
    primaryAudience: {
      name: primaryTarget.profile.name,
      fitScore: primaryTarget.score,
      compatibility: primaryTarget.compatibility,
      description: primaryTarget.profile.description,
      marketSize: primaryTarget.profile.size,
      positiveMatches: primaryTarget.matchedPositives,
      negativeMatches: primaryTarget.matchedNegatives,
      sessionPreferences: primaryTarget.profile.sessionBehavior,
      spendingBehavior: primaryTarget.profile.spendingBehavior,
      designAdvice: primaryTarget.profile.designAdvice,
      exampleGames: primaryTarget.profile.gameExamples,
    },
    allAudienceScores: audienceScores.map(entry => ({
      audience: entry.profile.name,
      fitScore: entry.score,
      compatibility: entry.compatibility,
      keyStrengths: entry.matchedPositives.slice(0, 3),
      keyConcerns: entry.matchedNegatives.slice(0, 2),
    })),
    topAudiences: topAudiences.map(entry => entry.profile.name),
    poorFitAudiences: poorFits.map(entry => entry.profile.name),
    monetizationAnalysis: {
      recommendedModels: recommendedModel.slice(0, 3),
      expectedSpend: spendingEstimate,
      spendingTriggers: topAudiences
        .flatMap(entry => entry.profile.spendingBehavior.triggers)
        .slice(0, 5),
      spendingTurnoffs: topAudiences
        .flatMap(entry => entry.profile.spendingBehavior.turnoffs)
        .slice(0, 3),
    },
    insights,
    recommendations,
    sessionDesignGuidance: {
      idealLength: primaryTarget.profile.sessionBehavior.preferredLength,
      frequency: primaryTarget.profile.sessionBehavior.frequency,
      interruptibility: primaryTarget.profile.sessionBehavior.interruptibility,
    },
  }
}
