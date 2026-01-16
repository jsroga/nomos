/**
 * Market Analyst - Professional Test Suite
 *
 * Comprehensive testing with:
 * - Property-based testing (fast-check)
 * - Boundary analysis
 * - Performance benchmarks
 * - Contract validation
 * - Chaos engineering
 * - Snapshot testing
 */

import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest'
import * as fc from 'fast-check'

// Tool imports
import { competitorFinderTool } from '../tools/competitor-finder'
import { metricsPlannerTool } from '../tools/metrics-planner'
import { patternMatcherTool } from '../tools/pattern-matcher'
import { marketSizeEstimatorTool } from '../tools/market-size'
import { audienceAnalyzerTool } from '../tools/audience-analyzer'
import { trendAnalyzerTool } from '../tools/trend-analyzer'
import { discoElysiumScorerTool } from '../tools/scorers/disco-elysium'
import { vampireSurvivorsScorerTool } from '../tools/scorers/vampire-survivors'
import { counterStrikeScorerTool } from '../tools/scorers/counter-strike'
import { reportGeneratorTool } from '../tools/report-generator'
import { marketAnalystTools } from '../index'

// =============================================================================
// TEST FIXTURES & ARBITRARIES
// =============================================================================

/** Arbitrary for generating valid mechanic objects */
const mechanicArb = fc.record({
  name: fc.string({ minLength: 1, maxLength: 50 }),
  type: fc.constantFrom(
    'core',
    'secondary',
    'meta',
    'progression',
    'reward',
    'action',
    'narrative'
  ),
  description: fc.string({ maxLength: 200 }),
})

/** Arbitrary for generating valid genre strings */
const genreArb = fc.constantFrom(
  'roguelike',
  'survivors-like',
  'deck-builder',
  'action',
  'rpg',
  'narrative',
  'competitive',
  'casual',
  'mobile',
  'fps',
  'strategy'
)

/** Arbitrary for generating valid platform strings */
const platformArb = fc.constantFrom('pc', 'mobile', 'console', 'multi-platform')

/** Arbitrary for generating valid business models */
const businessModelArb = fc.constantFrom('premium', 'f2p', 'freemium', 'subscription')

/** Generate a realistic mechanic set */
const mechanicsSetArb = fc.array(mechanicArb, { minLength: 0, maxLength: 20 })

// =============================================================================
// PROPERTY-BASED TESTS
// =============================================================================

describe('Property-Based Testing', () => {
  describe('Competitor Finder - Invariants', () => {
    it('should always return valid JSON regardless of input', async () => {
      await fc.assert(
        fc.asyncProperty(
          genreArb,
          fc.array(fc.string(), { maxLength: 5 }),
          async (genre, mechanics) => {
            const result = await competitorFinderTool.invoke({
              genre,
              mechanics,
              analysisDepth: 'quick',
              limit: 5,
            })

            expect(() => JSON.parse(result)).not.toThrow()
            const parsed = JSON.parse(result)
            expect(parsed).toHaveProperty('success')
          }
        ),
        { numRuns: 50 }
      )
    })

    it('should never return more competitors than limit', async () => {
      await fc.assert(
        fc.asyncProperty(genreArb, fc.integer({ min: 1, max: 10 }), async (genre, limit) => {
          const result = await competitorFinderTool.invoke({
            genre,
            analysisDepth: 'quick',
            limit,
          })

          const parsed = JSON.parse(result)
          if (parsed.success && parsed.competitors) {
            expect(parsed.competitors.length).toBeLessThanOrEqual(limit)
          }
        }),
        { numRuns: 30 }
      )
    })

    it('similarity scores should always be 0-100', async () => {
      await fc.assert(
        fc.asyncProperty(genreArb, async genre => {
          const result = await competitorFinderTool.invoke({
            genre,
            analysisDepth: 'comprehensive',
            limit: 10,
          })

          const parsed = JSON.parse(result)
          if (parsed.success && parsed.competitors) {
            for (const comp of parsed.competitors) {
              expect(comp.similarityScore).toBeGreaterThanOrEqual(0)
              expect(comp.similarityScore).toBeLessThanOrEqual(100)
            }
          }
        }),
        { numRuns: 20 }
      )
    })
  })

  describe('Metrics Planner - Invariants', () => {
    it('should always return metrics for any genre/model combination', async () => {
      await fc.assert(
        fc.asyncProperty(
          genreArb,
          businessModelArb,
          platformArb,
          async (genre, model, platform) => {
            const result = await metricsPlannerTool.invoke({
              gameGenre: genre,
              businessModel: model,
              platform,
            })

            const parsed = JSON.parse(result)
            expect(parsed.success).toBe(true)
            expect(parsed.priorityMetrics).toBeInstanceOf(Array)
            expect(parsed.priorityMetrics.length).toBeGreaterThan(0)
          }
        ),
        { numRuns: 50 }
      )
    })

    it('benchmarks should have consistent structure', async () => {
      await fc.assert(
        fc.asyncProperty(genreArb, businessModelArb, async (genre, model) => {
          const result = await metricsPlannerTool.invoke({
            gameGenre: genre,
            businessModel: model,
            platform: 'pc',
          })

          const parsed = JSON.parse(result)
          for (const metric of parsed.priorityMetrics) {
            expect(metric.benchmarks).toHaveProperty('poor')
            expect(metric.benchmarks).toHaveProperty('average')
            expect(metric.benchmarks).toHaveProperty('good')
            expect(metric.benchmarks).toHaveProperty('excellent')
          }
        }),
        { numRuns: 30 }
      )
    })
  })

  describe('Scorer Tools - Score Bounds', () => {
    it('all scores should be 0-100 for any mechanics input', async () => {
      await fc.assert(
        fc.asyncProperty(mechanicsSetArb, async mechanics => {
          const [disco, vampire, cs] = await Promise.all([
            discoElysiumScorerTool.invoke({ mechanics }),
            vampireSurvivorsScorerTool.invoke({ mechanics }),
            counterStrikeScorerTool.invoke({ mechanics }),
          ])

          for (const result of [disco, vampire, cs]) {
            const parsed = JSON.parse(result)
            expect(parsed.finalScore).toBeGreaterThanOrEqual(0)
            expect(parsed.finalScore).toBeLessThanOrEqual(100)
          }
        }),
        { numRuns: 30 }
      )
    })
  })
})

// =============================================================================
// BOUNDARY & EDGE CASE TESTING
// =============================================================================

describe('Boundary Analysis', () => {
  describe('Empty Input Handling', () => {
    it('competitor_finder: empty genre should not crash', async () => {
      const result = await competitorFinderTool.invoke({
        genre: '',
        analysisDepth: 'quick',
      })
      const parsed = JSON.parse(result)
      expect(parsed.success).toBe(true)
    })

    it('metrics_planner: handles empty strings gracefully', async () => {
      const result = await metricsPlannerTool.invoke({
        gameGenre: '',
        businessModel: 'premium',
        platform: 'pc',
      })
      const parsed = JSON.parse(result)
      expect(parsed.success).toBe(true)
    })

    it('pattern_matcher: empty mechanics returns suggestions', async () => {
      const result = await patternMatcherTool.invoke({
        mechanics: [],
      })
      const parsed = JSON.parse(result)
      expect(parsed.success).toBe(true)
      expect(parsed.suggestedPatterns).toBeDefined()
    })

    it('scorers: empty mechanics returns 0 or base score', async () => {
      const results = await Promise.all([
        discoElysiumScorerTool.invoke({ mechanics: [] }),
        vampireSurvivorsScorerTool.invoke({ mechanics: [] }),
        counterStrikeScorerTool.invoke({ mechanics: [] }),
      ])

      for (const result of results) {
        const parsed = JSON.parse(result)
        expect(parsed.success).toBe(true)
        expect(parsed.finalScore).toBeLessThanOrEqual(50) // Should not score high with no mechanics
      }
    })
  })

  describe('Large Input Handling', () => {
    it('should handle 100 mechanics without timeout', async () => {
      const largeMechanics = Array.from({ length: 100 }, (_, i) => ({
        name: `Mechanic ${i}`,
        type: 'core',
        description: `Description for mechanic ${i} with some additional text to make it realistic`,
      }))

      const startTime = Date.now()
      const result = await patternMatcherTool.invoke({ mechanics: largeMechanics })
      const duration = Date.now() - startTime

      const parsed = JSON.parse(result)
      expect(parsed.success).toBe(true)
      expect(duration).toBeLessThan(5000) // Should complete within 5s
    })

    it('should handle very long mechanic names', async () => {
      const longName = 'A'.repeat(1000)
      const result = await patternMatcherTool.invoke({
        mechanics: [{ name: longName, type: 'core', description: 'test' }],
      })
      const parsed = JSON.parse(result)
      expect(parsed.success).toBe(true)
    })
  })

  describe('Special Characters', () => {
    const specialChars = [
      '<script>alert(1)</script>',
      '"; DROP TABLE games;--',
      '🎮💀⚔️',
      '日本語テスト',
    ]

    it.each(specialChars)('should handle special input: %s', async input => {
      const result = await competitorFinderTool.invoke({
        genre: input,
        analysisDepth: 'quick',
      })
      expect(() => JSON.parse(result)).not.toThrow()
    })
  })
})

// =============================================================================
// PERFORMANCE BENCHMARKS
// =============================================================================

describe('Performance Benchmarks', () => {
  const benchmarkResults: Record<string, number[]> = {}

  afterAll(() => {
    console.log('\n📊 Performance Benchmark Results:')
    console.log('='.repeat(50))
    for (const [tool, times] of Object.entries(benchmarkResults)) {
      const avg = times.reduce((a, b) => a + b, 0) / times.length
      const max = Math.max(...times)
      const min = Math.min(...times)
      const p95 = times.sort((a, b) => a - b)[Math.floor(times.length * 0.95)]
      console.log(`${tool}:`)
      console.log(`  avg: ${avg.toFixed(2)}ms | min: ${min}ms | max: ${max}ms | p95: ${p95}ms`)
    }
  })

  const runBenchmark = async (name: string, fn: () => Promise<any>, iterations = 10) => {
    benchmarkResults[name] = []
    for (let i = 0; i < iterations; i++) {
      const start = performance.now()
      await fn()
      benchmarkResults[name].push(Math.round(performance.now() - start))
    }
  }

  it('competitor_finder quick mode < 50ms avg', async () => {
    await runBenchmark('competitor_finder_quick', () =>
      competitorFinderTool.invoke({ genre: 'roguelike', analysisDepth: 'quick', limit: 3 })
    )
    const avg = benchmarkResults['competitor_finder_quick'].reduce((a, b) => a + b, 0) / 10
    expect(avg).toBeLessThan(50)
  })

  it('competitor_finder comprehensive mode < 100ms avg', async () => {
    await runBenchmark('competitor_finder_comprehensive', () =>
      competitorFinderTool.invoke({ genre: 'roguelike', analysisDepth: 'comprehensive', limit: 5 })
    )
    const avg = benchmarkResults['competitor_finder_comprehensive'].reduce((a, b) => a + b, 0) / 10
    expect(avg).toBeLessThan(100)
  })

  it('metrics_planner < 50ms avg', async () => {
    await runBenchmark('metrics_planner', () =>
      metricsPlannerTool.invoke({
        gameGenre: 'roguelike',
        businessModel: 'premium',
        platform: 'pc',
      })
    )
    const avg = benchmarkResults['metrics_planner'].reduce((a, b) => a + b, 0) / 10
    expect(avg).toBeLessThan(50)
  })

  it('all 3 scorers in parallel < 100ms avg', async () => {
    const mechanics = [{ name: 'Test', type: 'core', description: 'Test mechanic' }]
    await runBenchmark('scorers_parallel', () =>
      Promise.all([
        discoElysiumScorerTool.invoke({ mechanics }),
        vampireSurvivorsScorerTool.invoke({ mechanics }),
        counterStrikeScorerTool.invoke({ mechanics }),
      ])
    )
    const avg = benchmarkResults['scorers_parallel'].reduce((a, b) => a + b, 0) / 10
    expect(avg).toBeLessThan(100)
  })

  it('report_generator < 50ms avg', async () => {
    await runBenchmark('report_generator', () =>
      reportGeneratorTool.invoke({
        discoElysiumScore: 50,
        vampireSurvivorsScore: 70,
        counterStrikeScore: 30,
        marketSize: { tam: '$1B', relevantSegment: '$100M', growthRate: '20%' },
        competitors: [
          { name: 'Test', genre: 'test', similarityScore: 50, strengths: [], weaknesses: [] },
        ],
        audienceFit: { targetDemographic: 'Test', fitScore: 50, strengths: [], concerns: [] },
        trends: [],
        patterns: [],
        keyStrengths: ['Test'],
        keyRisks: ['Test'],
        recommendations: ['Test'],
      })
    )
    const avg = benchmarkResults['report_generator'].reduce((a, b) => a + b, 0) / 10
    expect(avg).toBeLessThan(50)
  })
})

// =============================================================================
// CONTRACT TESTING
// =============================================================================

describe('Contract Testing', () => {
  describe('Tool Response Contracts', () => {
    const validateResponseContract = (response: string, requiredFields: string[]) => {
      const parsed = JSON.parse(response)
      expect(parsed).toHaveProperty('success')
      for (const field of requiredFields) {
        expect(parsed).toHaveProperty(field)
      }
      return parsed
    }

    it('competitor_finder response contract', async () => {
      const result = await competitorFinderTool.invoke({
        genre: 'roguelike',
        analysisDepth: 'comprehensive',
        limit: 3,
      })

      const parsed = validateResponseContract(result, [
        'success',
        'searchCriteria',
        'competitorCount',
        'competitors',
        'marketDensity',
        'insights',
      ])

      // Competitor object contract
      if (parsed.competitors.length > 0) {
        const comp = parsed.competitors[0]
        expect(comp).toHaveProperty('name')
        expect(comp).toHaveProperty('similarityScore')
        expect(comp).toHaveProperty('strengths')
        expect(comp).toHaveProperty('weaknesses')
        expect(comp).toHaveProperty('designLessons')
        expect(comp).toHaveProperty('successFactors')
      }
    })

    it('metrics_planner response contract', async () => {
      const result = await metricsPlannerTool.invoke({
        gameGenre: 'roguelike',
        businessModel: 'premium',
        platform: 'pc',
        developmentPhase: 'prototype',
      })

      const parsed = validateResponseContract(result, [
        'success',
        'gameProfile',
        'priorityMetrics',
        'additionalCriticalMetrics',
        'phaseRecommendations',
        'targetGuidance',
        'quickReference',
      ])

      // Metric object contract
      if (parsed.priorityMetrics.length > 0) {
        const metric = parsed.priorityMetrics[0]
        expect(metric).toHaveProperty('name')
        expect(metric).toHaveProperty('category')
        expect(metric).toHaveProperty('importance')
        expect(metric).toHaveProperty('benchmarks')
        expect(metric).toHaveProperty('measurementTiming')
      }
    })

    it('scorer response contract (all 3 scorers)', async () => {
      const mechanics = [{ name: 'Test', type: 'core', description: 'Test' }]

      const scorers = [
        { tool: discoElysiumScorerTool, name: 'Disco Elysium Score' },
        { tool: vampireSurvivorsScorerTool, name: 'Vampire Survivors Score' },
        { tool: counterStrikeScorerTool, name: 'Counter-Strike Score' },
      ]

      for (const { tool, name } of scorers) {
        const result = await tool.invoke({ mechanics })
        const parsed = validateResponseContract(result, [
          'success',
          'scoreName',
          'scoreType',
          'finalScore',
          'maxScore',
          'breakdown',
          'insights',
          'interpretation',
        ])

        expect(parsed.scoreName).toBe(name)
        expect(parsed.maxScore).toBe(100)
        expect(typeof parsed.finalScore).toBe('number')
      }
    })

    it('report_generator response contract', async () => {
      const result = await reportGeneratorTool.invoke({
        discoElysiumScore: 50,
        vampireSurvivorsScore: 70,
        counterStrikeScore: 30,
        marketSize: { tam: '$1B', relevantSegment: '$100M', growthRate: '20%' },
        competitors: [],
        audienceFit: { targetDemographic: 'Test', fitScore: 50, strengths: [], concerns: [] },
        trends: [],
        patterns: [],
        keyStrengths: [],
        keyRisks: [],
        recommendations: [],
      })

      const parsed = validateResponseContract(result, ['success', 'report', 'summary', '_internal'])

      // Report object contract
      const report = parsed.report
      expect(report).toHaveProperty('overallScore')
      expect(report).toHaveProperty('marketSize')
      expect(report).toHaveProperty('competitors')
      expect(report).toHaveProperty('audienceFit')
      expect(report).toHaveProperty('recommendations')
      expect(report).toHaveProperty('risks')
      expect(report).toHaveProperty('opportunities')
      expect(report).toHaveProperty('generatedAt')
      expect(report).toHaveProperty('confidence')
    })
  })

  describe('Tool Schema Contracts', () => {
    it('all tools should have zod schemas', () => {
      for (const tool of marketAnalystTools) {
        expect(tool.schema).toBeDefined()
        expect(tool.schema._def).toBeDefined() // Zod schema internals
      }
    })

    it('tool descriptions should be informative (>50 chars)', () => {
      for (const tool of marketAnalystTools) {
        expect(tool.description.length).toBeGreaterThan(50)
      }
    })
  })
})

// =============================================================================
// CHAOS ENGINEERING
// =============================================================================

describe('Chaos Engineering', () => {
  describe('Schema Validation (Zod Guard Rails)', () => {
    // These tests verify that Zod schemas CORRECTLY reject invalid input
    // This is desired behavior - bad data should fail fast at the boundary

    it('should reject null values in required string fields', async () => {
      await expect(
        patternMatcherTool.invoke({
          mechanics: [{ name: null as any, type: 'core', description: 'test' }],
        })
      ).rejects.toThrow()
    })

    it('should reject undefined in required fields', async () => {
      await expect(
        patternMatcherTool.invoke({
          mechanics: [{ name: 'valid', type: undefined as any, description: 'test' }],
        })
      ).rejects.toThrow()
    })

    it('should accept valid numeric strings (coercible)', async () => {
      // Numeric strings are valid strings - Zod accepts them
      const result = await competitorFinderTool.invoke({
        genre: '123456',
        analysisDepth: 'quick',
      })

      const parsed = JSON.parse(result)
      expect(parsed.success).toBe(true)
    })

    it('should reject objects where string expected', async () => {
      await expect(
        competitorFinderTool.invoke({
          genre: { nested: 'object' } as any,
          analysisDepth: 'quick',
        })
      ).rejects.toThrow(/Expected string/)
    })

    it('should reject invalid enum values', async () => {
      await expect(
        metricsPlannerTool.invoke({
          gameGenre: 'roguelike',
          businessModel: 'invalid_model' as any,
          platform: 'pc',
        })
      ).rejects.toThrow()
    })

    it('should accept valid edge case inputs', async () => {
      // Empty string is a valid string
      const result = await competitorFinderTool.invoke({
        genre: '',
        analysisDepth: 'quick',
      })
      expect(() => JSON.parse(result)).not.toThrow()

      // Unicode is valid
      const unicodeResult = await competitorFinderTool.invoke({
        genre: '🎮 roguelike 日本語',
        analysisDepth: 'quick',
      })
      expect(() => JSON.parse(unicodeResult)).not.toThrow()
    })
  })

  describe('Concurrent Access', () => {
    it('should handle 50 concurrent tool calls', async () => {
      const calls = Array.from({ length: 50 }, (_, i) =>
        competitorFinderTool.invoke({
          genre: ['roguelike', 'survivors-like', 'deck-builder', 'action', 'rpg'][i % 5],
          analysisDepth: 'quick',
          limit: 3,
        })
      )

      const startTime = Date.now()
      const results = await Promise.all(calls)
      const duration = Date.now() - startTime

      // All should succeed
      for (const result of results) {
        const parsed = JSON.parse(result)
        expect(parsed.success).toBe(true)
      }

      // Should complete within reasonable time (not serialized)
      expect(duration).toBeLessThan(2000)
      console.log(`50 concurrent calls completed in ${duration}ms`)
    })
  })

  describe('State Isolation', () => {
    it('tool calls should not leak state between invocations', async () => {
      // Call with specific input
      await competitorFinderTool.invoke({
        genre: 'roguelike',
        mechanics: ['permadeath', 'random'],
        analysisDepth: 'comprehensive',
      })

      // Call with different input - should not be affected by previous
      const result = await competitorFinderTool.invoke({
        genre: 'narrative',
        analysisDepth: 'quick',
      })

      const parsed = JSON.parse(result)
      // Should not contain roguelike-specific results
      expect(parsed.searchCriteria.genre).toBe('narrative')
      expect(parsed.searchCriteria.mechanics).toBeUndefined()
    })
  })
})

// =============================================================================
// SNAPSHOT TESTING
// =============================================================================

describe('Snapshot Testing', () => {
  it('competitor response structure for roguelike', async () => {
    const result = await competitorFinderTool.invoke({
      genre: 'roguelike',
      analysisDepth: 'detailed',
      limit: 2,
    })

    const parsed = JSON.parse(result)

    // Test structure, not values (values may change)
    expect(Object.keys(parsed).sort()).toMatchInlineSnapshot(`
      [
        "competitorCount",
        "competitors",
        "insights",
        "marketDensity",
        "marketGaps",
        "pricingStrategy",
        "searchCriteria",
        "success",
      ]
    `)
  })

  it('metrics response structure', async () => {
    const result = await metricsPlannerTool.invoke({
      gameGenre: 'roguelike',
      businessModel: 'premium',
      platform: 'pc',
    })

    const parsed = JSON.parse(result)

    expect(Object.keys(parsed).sort()).toMatchInlineSnapshot(`
      [
        "additionalCriticalMetrics",
        "customMetricSuggestions",
        "gameProfile",
        "phaseRecommendations",
        "priorityMetrics",
        "quickReference",
        "success",
        "targetGuidance",
      ]
    `)
  })
})
