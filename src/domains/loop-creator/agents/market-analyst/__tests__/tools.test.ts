/**
 * Market Analyst Tools - Unit Tests
 *
 * Tests for individual tools to verify they return expected data structures.
 */

import { describe, it, expect } from 'vitest'

// Import tools
import { competitorFinderTool } from '../tools/competitor-finder'
import { metricsPlannerTool } from '../tools/metrics-planner'
import { patternMatcherTool } from '../tools/pattern-matcher'
import { marketSizeEstimatorTool } from '../tools/market-size'
import { audienceAnalyzerTool } from '../tools/audience-analyzer'
import { trendAnalyzerTool } from '../tools/trend-analyzer'
import { steamChartsTool } from '../tools/steam-charts'
import { gameDatabaseTool } from '../tools/game-database'
import { discoElysiumScorerTool } from '../tools/scorers/disco-elysium'
import { vampireSurvivorsScorerTool } from '../tools/scorers/vampire-survivors'
import { counterStrikeScorerTool } from '../tools/scorers/counter-strike'

describe('Competitor Finder Tool', () => {
  it('should find competitors for roguelike genre', async () => {
    const result = await competitorFinderTool.invoke({
      genre: 'roguelike',
      analysisDepth: 'detailed',
      limit: 3,
    })

    const parsed = JSON.parse(result)

    expect(parsed.success).toBe(true)
    expect(parsed.competitorCount).toBeGreaterThan(0)
    expect(parsed.competitors).toBeDefined()
    expect(parsed.competitors.length).toBeLessThanOrEqual(3)

    // Check competitor structure
    const competitor = parsed.competitors[0]
    expect(competitor.name).toBeDefined()
    expect(competitor.similarityScore).toBeGreaterThan(0)
    expect(competitor.strengths).toBeInstanceOf(Array)
    expect(competitor.weaknesses).toBeInstanceOf(Array)
  })

  it('should return comprehensive analysis with design lessons', async () => {
    const result = await competitorFinderTool.invoke({
      genre: 'survivors-like',
      analysisDepth: 'comprehensive',
      limit: 2,
    })

    const parsed = JSON.parse(result)

    expect(parsed.success).toBe(true)
    expect(parsed.pricingStrategy).toBeDefined()
    expect(parsed.loopBenchmarks).toBeDefined()
    expect(parsed.consensusLessons).toBeDefined()
    expect(parsed.mistakesToAvoid).toBeDefined()

    // Comprehensive includes full competitor data
    const competitor = parsed.competitors[0]
    expect(competitor.designLessons).toBeDefined()
    expect(competitor.successFactors).toBeDefined()
  })

  it('should return quick analysis without deep data', async () => {
    const result = await competitorFinderTool.invoke({
      genre: 'deck-builder',
      analysisDepth: 'quick',
      limit: 5,
    })

    const parsed = JSON.parse(result)

    expect(parsed.success).toBe(true)
    // Quick mode should NOT have deep analysis
    expect(parsed.pricingStrategy).toBeUndefined()
    expect(parsed.loopBenchmarks).toBeUndefined()
  })

  it('should filter by platform', async () => {
    const result = await competitorFinderTool.invoke({
      genre: 'action',
      platform: 'mobile',
      analysisDepth: 'detailed',
    })

    const parsed = JSON.parse(result)
    expect(parsed.success).toBe(true)
  })
})

describe('Metrics Planner Tool', () => {
  it('should return prioritized metrics for roguelike', async () => {
    const result = await metricsPlannerTool.invoke({
      gameGenre: 'roguelike',
      businessModel: 'premium',
      platform: 'pc',
    })

    const parsed = JSON.parse(result)

    expect(parsed.success).toBe(true)
    expect(parsed.priorityMetrics).toBeInstanceOf(Array)
    expect(parsed.priorityMetrics.length).toBeGreaterThan(0)

    // Check metric structure
    const metric = parsed.priorityMetrics[0]
    expect(metric.name).toBeDefined()
    expect(metric.category).toBeDefined()
    expect(metric.benchmarks).toBeDefined()
    expect(metric.benchmarks.poor).toBeDefined()
    expect(metric.benchmarks.excellent).toBeDefined()
  })

  it('should include real-world examples', async () => {
    const result = await metricsPlannerTool.invoke({
      gameGenre: 'survivors-like',
      businessModel: 'premium',
      platform: 'pc',
    })

    const parsed = JSON.parse(result)

    // At least some metrics should have examples
    const metricsWithExamples = parsed.priorityMetrics.filter((m: any) => m.realWorldExample)
    expect(metricsWithExamples.length).toBeGreaterThan(0)

    const example = metricsWithExamples[0].realWorldExample
    expect(example.game).toBeDefined()
    expect(example.value).toBeDefined()
    expect(example.insight).toBeDefined()
  })

  it('should adapt metrics for f2p mobile', async () => {
    const result = await metricsPlannerTool.invoke({
      gameGenre: 'casual',
      businessModel: 'f2p',
      platform: 'mobile',
    })

    const parsed = JSON.parse(result)

    expect(parsed.success).toBe(true)

    // Should include monetization metrics for f2p
    const metricNames = parsed.priorityMetrics.map((m: any) => m.name)
    const hasMonetizationMetric = metricNames.some(
      (name: string) =>
        name.includes('ARPDAU') || name.includes('Conversion') || name.includes('LTV')
    )
    expect(hasMonetizationMetric).toBe(true)
  })

  it('should provide phase-specific recommendations', async () => {
    const result = await metricsPlannerTool.invoke({
      gameGenre: 'roguelike',
      businessModel: 'premium',
      platform: 'pc',
      developmentPhase: 'prototype',
    })

    const parsed = JSON.parse(result)

    expect(parsed.phaseRecommendations).toBeInstanceOf(Array)
    expect(parsed.phaseRecommendations.length).toBeGreaterThan(0)
  })
})

describe('Pattern Matcher Tool', () => {
  it('should match roguelike patterns', async () => {
    const result = await patternMatcherTool.invoke({
      mechanics: [
        { name: 'Permadeath', type: 'core', description: 'Death resets progress' },
        { name: 'Random Levels', type: 'core', description: 'Procedurally generated dungeons' },
        { name: 'Unlock System', type: 'meta', description: 'Permanent unlocks between runs' },
      ],
    })

    const parsed = JSON.parse(result)

    expect(parsed.success).toBe(true)
    expect(parsed.matchedPatterns).toBeInstanceOf(Array)
    expect(parsed.matchedPatterns.length).toBeGreaterThan(0)

    const pattern = parsed.matchedPatterns[0]
    expect(pattern.patternName).toBeDefined()
    expect(pattern.matchScore).toBeGreaterThan(0)
    expect(pattern.description).toBeDefined()
  })

  it('should suggest missing patterns', async () => {
    const result = await patternMatcherTool.invoke({
      mechanics: [{ name: 'Basic Combat', type: 'action', description: 'Simple attack' }],
    })

    const parsed = JSON.parse(result)

    expect(parsed.suggestedPatterns).toBeDefined()
    expect(parsed.suggestedPatterns.length).toBeGreaterThan(0)
  })
})

describe('Market Size Estimator Tool', () => {
  it('should estimate TAM for roguelike PC', async () => {
    const result = await marketSizeEstimatorTool.invoke({
      genre: 'roguelike',
      platform: 'pc',
      isIndie: true,
    })

    const parsed = JSON.parse(result)

    expect(parsed.success).toBe(true)
    expect(parsed.data).toBeDefined()
    expect(parsed.data.tam).toBeDefined()
    expect(parsed.data.relevantSegment).toBeDefined()
    expect(parsed.data.growthRate).toBeDefined()
  })
})

describe('Audience Analyzer Tool', () => {
  it('should analyze audience fit', async () => {
    const result = await audienceAnalyzerTool.invoke({
      mechanics: [
        { name: 'Auto-attack', type: 'core', description: 'Automatic combat' },
        { name: 'Level Up', type: 'progression', description: 'Gain experience and level' },
      ],
      targetAudience: 'casual',
    })

    const parsed = JSON.parse(result)

    expect(parsed.success).toBe(true)
    expect(parsed.primaryAudience).toBeDefined()
    expect(parsed.primaryAudience.fitScore).toBeDefined()
    expect(parsed.primaryAudience.fitScore).toBeGreaterThanOrEqual(0)
    expect(parsed.primaryAudience.fitScore).toBeLessThanOrEqual(100)
    expect(parsed.allAudienceScores).toBeInstanceOf(Array)
    expect(parsed.allAudienceScores.length).toBeGreaterThan(0)
  })
})

describe('Trend Analyzer Tool', () => {
  it('should find relevant trends', async () => {
    const result = await trendAnalyzerTool.invoke({
      genre: 'roguelike',
      mechanics: ['survivors-like', 'auto-attack'],
    })

    const parsed = JSON.parse(result)

    expect(parsed.success).toBe(true)
    expect(parsed.trends).toBeInstanceOf(Array)
    expect(parsed.summary).toBeDefined()
    expect(parsed.summary.opportunities).toBeInstanceOf(Array)
  })
})

describe('Steam Charts Tool', () => {
  it('should return data for known games', async () => {
    const result = await steamChartsTool.invoke({
      gameName: 'Vampire Survivors',
    })

    const parsed = JSON.parse(result)

    expect(parsed.success).toBe(true)
    expect(parsed.data).toBeDefined()
    expect(parsed.data.gameName).toBe('Vampire Survivors')
    expect(parsed.data.currentPlayers).toBeDefined()
  })

  it('should handle unknown games gracefully', async () => {
    const result = await steamChartsTool.invoke({
      gameName: 'Unknown Game XYZ 12345',
    })

    const parsed = JSON.parse(result)

    expect(parsed.success).toBe(true)
    // Should still return structure, just with unknown values
    expect(parsed.data).toBeDefined()
  })
})

describe('Game Database Tool', () => {
  it('should find games by genre', async () => {
    const result = await gameDatabaseTool.invoke({
      query: 'roguelike',
      searchType: 'genre',
      limit: 5,
    })

    const parsed = JSON.parse(result)

    expect(parsed.success).toBe(true)
    expect(parsed.results).toBeInstanceOf(Array)
    expect(parsed.resultCount).toBeGreaterThan(0)
  })

  it('should find similar games', async () => {
    const result = await gameDatabaseTool.invoke({
      query: 'Vampire Survivors',
      searchType: 'similar',
    })

    const parsed = JSON.parse(result)

    expect(parsed.success).toBe(true)
  })
})

describe('Scorer Tools', () => {
  const testMechanics = [
    { name: 'Story Branch', type: 'narrative', description: 'Multiple story paths' },
    { name: 'Skill Check', type: 'core', description: 'Stats affect outcomes' },
    { name: 'Auto Attack', type: 'action', description: 'Automatic combat' },
    { name: 'Wave Survival', type: 'core', description: 'Survive enemy waves' },
    { name: 'Team Round', type: 'competitive', description: 'Round-based team play' },
  ]

  it('should score narrative depth (Disco Elysium)', async () => {
    const result = await discoElysiumScorerTool.invoke({
      mechanics: testMechanics,
      gameDescription: 'A narrative RPG with branching dialogue',
    })

    const parsed = JSON.parse(result)

    expect(parsed.success).toBe(true)
    expect(parsed.finalScore).toBeDefined()
    expect(parsed.finalScore).toBeGreaterThanOrEqual(0)
    expect(parsed.finalScore).toBeLessThanOrEqual(100)
    expect(parsed.breakdown).toBeDefined()
  })

  it('should score action satisfaction (Vampire Survivors)', async () => {
    const result = await vampireSurvivorsScorerTool.invoke({
      mechanics: testMechanics,
      gameDescription: 'An action roguelike with auto-attacks',
    })

    const parsed = JSON.parse(result)

    expect(parsed.success).toBe(true)
    expect(parsed.finalScore).toBeDefined()
    expect(parsed.scoreName).toBe('Vampire Survivors Score')
  })

  it('should score competitive elements (Counter-Strike)', async () => {
    const result = await counterStrikeScorerTool.invoke({
      mechanics: testMechanics,
      gameDescription: 'A competitive team shooter',
    })

    const parsed = JSON.parse(result)

    expect(parsed.success).toBe(true)
    expect(parsed.finalScore).toBeDefined()
    expect(parsed.scoreName).toBe('Counter-Strike Score')
  })
})

// Import new tools
import { bestMatchScorerTool } from '../tools/scorers/best-match'
import { twitterTrendsTool } from '../tools/twitter-trends'
import { steamTrendingTool } from '../tools/steam-trending'
import { redditPulseTool } from '../tools/reddit-pulse'
import { marketMomentumTool } from '../tools/market-momentum'

describe('Best Match Archetype Scorer', () => {
  const testMechanics = [
    { name: 'Auto-Attack', type: 'combat', description: 'Weapons fire automatically' },
    { name: 'XP Gems', type: 'reward', description: 'Collect gems to level up' },
    { name: 'Level Up', type: 'progression', description: 'Choose upgrades on level up' },
    { name: 'Weapon Evolution', type: 'reward', description: 'Max weapons evolve' },
  ]

  it('should identify the strongest archetype match', async () => {
    const result = await bestMatchScorerTool.invoke({
      mechanics: testMechanics,
      gameDescription: 'A survivors-like game with auto-combat',
    })

    const parsed = JSON.parse(result)

    expect(parsed.success).toBe(true)
    expect(parsed.primaryArchetype).toBeDefined()
    expect(parsed.primaryArchetype.archetype).toBeDefined()
    expect(parsed.primaryArchetype.score).toBeGreaterThanOrEqual(0)
    expect(parsed.primaryArchetype.score).toBeLessThanOrEqual(100)
    expect(parsed.primaryArchetype.keyPatterns).toBeInstanceOf(Array)
    expect(parsed.viabilityVerdict).toBeDefined()
  })

  it('should return all three archetype scores', async () => {
    const result = await bestMatchScorerTool.invoke({
      mechanics: testMechanics,
    })

    const parsed = JSON.parse(result)

    expect(parsed.success).toBe(true)
    expect(parsed.primaryArchetype).toBeDefined()
    expect(parsed.otherArchetypes).toBeInstanceOf(Array)
    expect(parsed.otherArchetypes.length).toBe(2)
  })

  it('should identify Vampire Survivors as primary for survivors-like design', async () => {
    const result = await bestMatchScorerTool.invoke({
      mechanics: testMechanics,
      gameDescription: 'roguelike with auto attacks and constant level ups',
      gameGenre: 'action roguelike',
    })

    const parsed = JSON.parse(result)

    expect(parsed.success).toBe(true)
    // Should match VS archetype best
    expect(parsed.primaryArchetype.archetype).toBe('vampire_survivors')
  })

  it('should identify Disco Elysium as primary for narrative design', async () => {
    const narrativeMechanics = [
      { name: 'Dialogue Trees', type: 'narrative', description: 'Complex branching dialogue' },
      { name: 'Skill Checks', type: 'skill', description: 'Stats affect conversation outcomes' },
      {
        name: 'Choice System',
        type: 'choice',
        description: 'Meaningful choices with consequences',
      },
    ]

    const result = await bestMatchScorerTool.invoke({
      mechanics: narrativeMechanics,
      gameDescription: 'A narrative RPG focused on dialogue and choices',
    })

    const parsed = JSON.parse(result)

    expect(parsed.success).toBe(true)
    expect(parsed.primaryArchetype.archetype).toBe('disco_elysium')
  })

  it('should provide viability verdict based on score', async () => {
    const result = await bestMatchScorerTool.invoke({
      mechanics: testMechanics,
    })

    const parsed = JSON.parse(result)

    expect(parsed.viabilityVerdict).toMatch(/strong|moderate|niche|unclear/)
    expect(parsed.viabilityReason).toBeDefined()
    expect(parsed.recommendation).toBeDefined()
  })
})

describe('Twitter Gaming Trends Tool', () => {
  it('should return trends for gaming topic', async () => {
    const result = await twitterTrendsTool.invoke({
      topic: 'roguelike',
    })

    const parsed = JSON.parse(result)

    expect(parsed.success).toBe(true)
    expect(parsed.trends).toBeInstanceOf(Array)
    expect(parsed.aggregate).toBeDefined()
    expect(parsed.aggregate.totalTweetVolume).toBeGreaterThanOrEqual(0)
  })

  it('should include sentiment analysis', async () => {
    const result = await twitterTrendsTool.invoke({
      topic: 'extraction shooter',
      includeEmerging: true,
    })

    const parsed = JSON.parse(result)

    expect(parsed.success).toBe(true)
    expect(parsed.aggregate.averageSentiment).toBeDefined()
    expect(parsed.aggregate.sentimentLabel).toMatch(/positive|negative|mixed/)
  })

  it('should filter by sentiment', async () => {
    const result = await twitterTrendsTool.invoke({
      topic: 'indie games',
      sentimentFilter: 'positive',
    })

    const parsed = JSON.parse(result)

    expect(parsed.success).toBe(true)
    // All returned trends should have positive sentiment if filter applied
    for (const trend of parsed.trends) {
      expect(trend.sentiment).toBe('positive')
    }
  })

  it('should include emerging trends', async () => {
    const result = await twitterTrendsTool.invoke({
      topic: 'gaming',
      includeEmerging: true,
    })

    const parsed = JSON.parse(result)

    expect(parsed.success).toBe(true)
    expect(parsed.trends.length).toBeGreaterThan(0)
    // Should have at least one rising trend
    const rising = parsed.trends.filter((t: any) => t.isRising)
    expect(rising.length).toBeGreaterThan(0)
  })
})

describe('Steam Trending Tool', () => {
  it('should return trending games', async () => {
    const result = await steamTrendingTool.invoke({
      limit: 5,
    })

    const parsed = JSON.parse(result)

    expect(parsed.success).toBe(true)
    expect(parsed.games).toBeInstanceOf(Array)
    expect(parsed.games.length).toBeLessThanOrEqual(5)
    expect(parsed.aggregate).toBeDefined()
  })

  it('should filter by genre', async () => {
    const result = await steamTrendingTool.invoke({
      genre: 'roguelike',
      limit: 10,
    })

    const parsed = JSON.parse(result)

    expect(parsed.success).toBe(true)
    // Games should be related to roguelike
    expect(parsed.games.length).toBeGreaterThan(0)
  })

  it('should filter indie only', async () => {
    const result = await steamTrendingTool.invoke({
      includeIndieOnly: true,
      limit: 5,
    })

    const parsed = JSON.parse(result)

    expect(parsed.success).toBe(true)
    for (const game of parsed.games) {
      expect(game.isIndie).toBe(true)
    }
  })

  it('should sort by growth rate', async () => {
    const result = await steamTrendingTool.invoke({
      sortBy: 'growth',
      limit: 5,
    })

    const parsed = JSON.parse(result)

    expect(parsed.success).toBe(true)
    expect(parsed.games.length).toBeGreaterThan(0)
  })

  it('should include genre analysis', async () => {
    const result = await steamTrendingTool.invoke({
      genre: 'extraction',
    })

    const parsed = JSON.parse(result)

    expect(parsed.success).toBe(true)
    expect(parsed.genreAnalysis).toBeInstanceOf(Array)
    if (parsed.genreAnalysis.length > 0) {
      expect(parsed.genreAnalysis[0].growthRate).toBeDefined()
      expect(parsed.genreAnalysis[0].trending).toBeDefined()
    }
  })
})

describe('Reddit Gaming Pulse Tool', () => {
  it('should return posts for gaming topic', async () => {
    const result = await redditPulseTool.invoke({
      topic: 'roguelike',
    })

    const parsed = JSON.parse(result)

    expect(parsed.success).toBe(true)
    expect(parsed.posts).toBeInstanceOf(Array)
    expect(parsed.aggregate).toBeDefined()
    expect(parsed.subredditPulse).toBeInstanceOf(Array)
  })

  it('should include community insights', async () => {
    const result = await redditPulseTool.invoke({
      topic: 'indie games',
    })

    const parsed = JSON.parse(result)

    expect(parsed.success).toBe(true)
    expect(parsed.communityInsights).toBeDefined()
    expect(parsed.communityInsights.hotTopics).toBeInstanceOf(Array)
    expect(parsed.communityInsights.commonComplaints).toBeInstanceOf(Array)
    expect(parsed.communityInsights.praisedFeatures).toBeInstanceOf(Array)
  })

  it('should filter by specific subreddits', async () => {
    const result = await redditPulseTool.invoke({
      topic: 'game development',
      subreddits: ['r/gamedev'],
    })

    const parsed = JSON.parse(result)

    expect(parsed.success).toBe(true)
    // Should have gamedev in subreddit pulse
    const hasGamedev = parsed.subredditPulse.some((s: any) => s.subreddit === 'r/gamedev')
    expect(hasGamedev).toBe(true)
  })

  it('should filter by sentiment', async () => {
    const result = await redditPulseTool.invoke({
      topic: 'extraction',
      sentimentFilter: 'positive',
    })

    const parsed = JSON.parse(result)

    expect(parsed.success).toBe(true)
    for (const post of parsed.posts) {
      expect(post.sentiment).toBe('positive')
    }
  })
})

describe('Market Momentum Tool', () => {
  it('should return genre momentum analysis', async () => {
    const result = await marketMomentumTool.invoke({})

    const parsed = JSON.parse(result)

    expect(parsed.success).toBe(true)
    expect(parsed.marketState).toBeDefined()
    expect(parsed.marketState.overallMomentum).toBeDefined()
    expect(parsed.genreAnalysis).toBeInstanceOf(Array)
  })

  it('should filter by target genres', async () => {
    const result = await marketMomentumTool.invoke({
      targetGenres: ['roguelike', 'extraction'],
    })

    const parsed = JSON.parse(result)

    expect(parsed.success).toBe(true)
    expect(parsed.genreAnalysis.length).toBeGreaterThan(0)
  })

  it('should include rising competitors', async () => {
    const result = await marketMomentumTool.invoke({
      includeRisingCompetitors: true,
    })

    const parsed = JSON.parse(result)

    expect(parsed.success).toBe(true)
    expect(parsed.risingCompetitors).toBeInstanceOf(Array)
    expect(parsed.risingCompetitors.length).toBeGreaterThan(0)

    const competitor = parsed.risingCompetitors[0]
    expect(competitor.game).toBeDefined()
    expect(competitor.lessonsToLearn).toBeInstanceOf(Array)
  })

  it('should include social buzz', async () => {
    const result = await marketMomentumTool.invoke({
      includeSocialBuzz: true,
    })

    const parsed = JSON.parse(result)

    expect(parsed.success).toBe(true)
    expect(parsed.socialBuzz).toBeInstanceOf(Array)
  })

  it('should provide market timing signals', async () => {
    const result = await marketMomentumTool.invoke({
      targetGenres: ['extraction'],
    })

    const parsed = JSON.parse(result)

    expect(parsed.success).toBe(true)
    expect(parsed.genreAnalysis.length).toBeGreaterThan(0)

    const genre = parsed.genreAnalysis[0]
    expect(genre.marketTiming).toMatch(/optimal|good|saturated|risky/)
    expect(genre.competitorDensity).toMatch(/low|medium|high|oversaturated/)
    expect(genre.opportunities).toBeInstanceOf(Array)
    expect(genre.risks).toBeInstanceOf(Array)
  })

  it('should provide actionable recommendations', async () => {
    const result = await marketMomentumTool.invoke({
      targetGenres: ['survivors-like'],
    })

    const parsed = JSON.parse(result)

    expect(parsed.success).toBe(true)
    expect(parsed.actionableRecommendations).toBeInstanceOf(Array)
    expect(parsed.insights).toBeInstanceOf(Array)
  })
})
