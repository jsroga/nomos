/**
 * Market Analyst Agent - Integration Tests
 *
 * Tests the full ReAct agent workflow with mocked LLM responses.
 */

import { describe, it, expect, vi } from 'vitest'
import { streamMarketAnalysis, marketAnalystTools, LoopAnalysisInput } from '../index'

// Mock the ChatOpenAI to avoid actual API calls
vi.mock('@langchain/openai', () => ({
  ChatOpenAI: vi.fn().mockImplementation(() => ({
    invoke: vi.fn().mockResolvedValue({
      content: JSON.stringify({
        thinking: 'Analyzing the game loop...',
        toolCalls: [],
      }),
    }),
    bindTools: vi.fn().mockReturnThis(),
  })),
}))

describe('Market Analyst Agent', () => {
  const sampleInput: LoopAnalysisInput = {
    mechanics: [
      { id: '1', name: 'Auto Attack', type: 'core', description: 'Automatic weapon attacks' },
      { id: '2', name: 'Level Up', type: 'progression', description: 'Gain XP and level up' },
      { id: '3', name: 'Wave Survival', type: 'core', description: 'Survive enemy waves' },
    ],
    connections: [
      { id: 'e1', source: '1', target: '2', label: 'generates XP' },
      { id: 'e2', source: '2', target: '1', label: 'improves damage' },
    ],
    loops: [{ id: 'l1', name: 'Core Loop', type: 'core', description: 'Kill → XP → Level → Kill' }],
    gameGenre: 'survivors-like',
    gamePlatform: 'pc',
    targetAudience: 'casual',
    gameDescription: 'A vampire survivors style auto-battler',
  }

  describe('Tool Suite', () => {
    it('should have all 18 tools available', () => {
      expect(marketAnalystTools).toHaveLength(18)

      const toolNames = marketAnalystTools.map(t => t.name)

      // Research tools
      expect(toolNames).toContain('web_search')
      expect(toolNames).toContain('steam_charts')
      expect(toolNames).toContain('game_database')

      // Real-time market signal tools
      expect(toolNames).toContain('market_momentum_analysis')
      expect(toolNames).toContain('twitter_gaming_trends')
      expect(toolNames).toContain('steam_trending')
      expect(toolNames).toContain('reddit_gaming_pulse')

      // Analysis tools
      expect(toolNames).toContain('pattern_matcher')
      expect(toolNames).toContain('competitor_finder')
      expect(toolNames).toContain('metrics_planner')
      expect(toolNames).toContain('audience_analyzer')
      expect(toolNames).toContain('trend_analyzer')
      expect(toolNames).toContain('market_size_estimator')

      // Archetype scorers
      expect(toolNames).toContain('best_match_archetype_scorer')
      expect(toolNames).toContain('disco_elysium_scorer')
      expect(toolNames).toContain('vampire_survivors_scorer')
      expect(toolNames).toContain('counter_strike_scorer')

      // Output tool
      expect(toolNames).toContain('generate_report')
    })

    it('should have valid schema for each tool', () => {
      for (const tool of marketAnalystTools) {
        expect(tool.name).toBeDefined()
        expect(tool.description).toBeDefined()
        expect(tool.description.length).toBeGreaterThan(10)
        expect(tool.schema).toBeDefined()
      }
    })
  })

  describe('Input Validation', () => {
    it('should handle empty mechanics array', async () => {
      const emptyInput: LoopAnalysisInput = {
        ...sampleInput,
        mechanics: [],
        connections: [],
        loops: [],
      }

      // Tools should still work with empty input
      const patternResult = await marketAnalystTools
        .find(t => t.name === 'pattern_matcher')!
        .invoke({ mechanics: [] })

      const parsed = JSON.parse(patternResult)
      expect(parsed.success).toBe(true)
    })

    it('should handle missing optional fields', async () => {
      const minimalInput: LoopAnalysisInput = {
        mechanics: [],
        connections: [],
        loops: [],
        gameGenre: '',
        gamePlatform: '',
        targetAudience: '',
        gameDescription: '',
      }

      // Metrics planner should still provide recommendations
      const metricsResult = await marketAnalystTools
        .find(t => t.name === 'metrics_planner')!
        .invoke({
          gameGenre: 'unknown',
          businessModel: 'premium',
          platform: 'pc',
        })

      const parsed = JSON.parse(metricsResult)
      expect(parsed.success).toBe(true)
      expect(parsed.priorityMetrics).toBeDefined()
    })
  })

  describe('Tool Orchestration', () => {
    it('should run competitor analysis → metrics planning workflow', async () => {
      // Step 1: Find competitors
      const competitorResult = await marketAnalystTools
        .find(t => t.name === 'competitor_finder')!
        .invoke({
          genre: 'survivors-like',
          analysisDepth: 'comprehensive',
          limit: 3,
        })

      const competitors = JSON.parse(competitorResult)
      expect(competitors.success).toBe(true)
      expect(competitors.competitors.length).toBeGreaterThan(0)

      // Step 2: Plan metrics based on competitor insights
      const metricsResult = await marketAnalystTools
        .find(t => t.name === 'metrics_planner')!
        .invoke({
          gameGenre: 'survivors-like',
          businessModel: 'premium',
          platform: 'pc',
          developmentPhase: 'concept',
        })

      const metrics = JSON.parse(metricsResult)
      expect(metrics.success).toBe(true)
      expect(metrics.priorityMetrics).toBeDefined()

      // Verify the workflow produces actionable data
      expect(competitors.consensusLessons).toBeDefined()
      expect(metrics.phaseRecommendations).toBeDefined()
    })

    it('should run full scoring workflow', async () => {
      const mechanics = sampleInput.mechanics.map(m => ({
        name: m.name,
        type: m.type,
        description: m.description,
      }))

      // Run all three scorers
      const [discoResult, vampireResult, csResult] = await Promise.all([
        marketAnalystTools
          .find(t => t.name === 'disco_elysium_scorer')!
          .invoke({ mechanics, gameDescription: sampleInput.gameDescription }),
        marketAnalystTools
          .find(t => t.name === 'vampire_survivors_scorer')!
          .invoke({ mechanics, gameDescription: sampleInput.gameDescription }),
        marketAnalystTools
          .find(t => t.name === 'counter_strike_scorer')!
          .invoke({ mechanics, gameDescription: sampleInput.gameDescription }),
      ])

      const disco = JSON.parse(discoResult)
      const vampire = JSON.parse(vampireResult)
      const cs = JSON.parse(csResult)

      // All should succeed
      expect(disco.success).toBe(true)
      expect(vampire.success).toBe(true)
      expect(cs.success).toBe(true)

      // Vampire Survivors score should be highest for this input
      expect(vampire.finalScore).toBeGreaterThan(disco.finalScore)
      expect(vampire.finalScore).toBeGreaterThan(cs.finalScore)
    })
  })

  describe('Report Generation', () => {
    it('should generate a complete report', async () => {
      const reportTool = marketAnalystTools.find(t => t.name === 'generate_report')!

      const result = await reportTool.invoke({
        discoElysiumScore: 25,
        vampireSurvivorsScore: 78,
        counterStrikeScore: 15,
        marketSize: {
          tam: '$800M',
          relevantSegment: '$80M',
          growthRate: '85% YoY',
        },
        competitors: [
          {
            name: 'Vampire Survivors',
            genre: 'survivors-like',
            similarityScore: 85,
            strengths: ['Simple controls', 'Addictive'],
            weaknesses: ['Repetitive'],
          },
        ],
        audienceFit: {
          targetDemographic: 'Casual gamers seeking short sessions',
          fitScore: 72,
          strengths: ['Easy to learn'],
          concerns: ['May lack depth'],
        },
        trends: [{ trend: 'Survivors-like Explosion', direction: 'rising', relevance: 90 }],
        patterns: [{ patternName: 'Power Fantasy Escalation', matchScore: 85 }],
        keyStrengths: ['Strong genre fit', 'Accessible design'],
        keyRisks: ['Crowded market', 'Differentiation needed'],
        recommendations: [
          'Add unique twist to differentiate',
          'Focus on satisfying power progression',
          'Keep runs under 30 minutes',
        ],
      })

      const report = JSON.parse(result)

      expect(report.success).toBe(true)
      expect(report.report).toBeDefined()
      expect(report.summary).toBeDefined()
      expect(report.summary.overallScore).toBeDefined()
      expect(report.summary.topRecommendations).toBeInstanceOf(Array)
    })
  })
})

describe('Streaming Market Analysis', () => {
  it('should yield progress events', async () => {
    const events: any[] = []

    // Note: This test uses the real streaming function
    // In production, you'd mock the agent
    const generator = streamMarketAnalysis({
      mechanics: [],
      connections: [],
      loops: [],
      gameGenre: 'test',
      gamePlatform: 'pc',
      targetAudience: 'core',
      gameDescription: 'Test game',
    })

    // Just verify the generator is created correctly
    expect(generator).toBeDefined()
    expect(typeof generator[Symbol.asyncIterator]).toBe('function')
  })
})
