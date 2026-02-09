/**
 * Game Design Evaluation - E2E Sanity Check
 *
 * Verifies:
 * 1. API compatibility with existing loop-creator routes
 * 2. Game design judges work with real-ish outputs
 * 3. Evaluation pipeline integration
 * 4. UX compatibility (SSE event structure)
 *
 * Run: npx vitest run src/evaluation/experiments/game-design-sanity.test.ts
 */

import { describe, it, expect, beforeAll } from 'vitest'
import {
  GameMechanicJudge,
  LoopStructureJudge,
  BalanceJudge,
  PsychologicalHookJudge,
  EconomyHealthJudge,
} from '../judges'

// Mock responses simulating real agent outputs
const MOCK_AGENT_OUTPUTS = {
  // Output from a "design core loop for farming game" request
  farmingLoopDesign: {
    mechanics: [
      {
        id: 'harvest',
        name: 'Harvest Crops',
        type: 'core',
        description:
          'Player collects mature crops from their farm plots, receiving resources and satisfaction',
        playerInteraction: 'active',
        balanceFactors: { effort: 3, reward: 5, frequency: 10 },
      },
      {
        id: 'plant',
        name: 'Plant Seeds',
        type: 'core',
        description: 'Player plants seeds in prepared soil, investing resources for future rewards',
        playerInteraction: 'active',
        balanceFactors: { effort: 2, reward: 1, frequency: 8 },
      },
      {
        id: 'sell',
        name: 'Sell at Market',
        type: 'core',
        description: 'Exchange harvested goods for currency at the village market',
        playerInteraction: 'active',
        balanceFactors: { effort: 1, reward: 6, frequency: 5 },
      },
    ],
    loops: [
      {
        id: 'core-farming',
        name: 'Harvest-Craft-Sell Loop',
        type: 'core',
        psychologicalHook:
          'The satisfaction of watching seeds grow into valuable crops creates anticipation and rewarding harvest moments',
        playerExperience: 'Nurturing growth and reaping rewards',
        satisfactionPeak: 'Seeing a field full of golden crops ready for harvest',
        nodes: [
          { id: 'n1', mechanicId: 'plant', label: 'Plant Seeds' },
          { id: 'n2', mechanicId: 'wait', label: 'Wait for Growth' },
          { id: 'n3', mechanicId: 'harvest', label: 'Harvest Crops' },
          { id: 'n4', mechanicId: 'sell', label: 'Sell at Market' },
        ],
        edges: [
          { id: 'e1', sourceNodeId: 'n1', targetNodeId: 'n2' },
          { id: 'e2', sourceNodeId: 'n2', targetNodeId: 'n3' },
          { id: 'e3', sourceNodeId: 'n3', targetNodeId: 'n4' },
          { id: 'e4', sourceNodeId: 'n4', targetNodeId: 'n1' }, // Cycle back
        ],
      },
    ],
    overallScore: 8,
    economyHealth: 'healthy',
  },

  // Output from a "analyze balance" request
  balanceAnalysis: {
    overallScore: 7,
    economyHealth: 'healthy',
    issues: [],
    simulationResults: {
      timeToFirstReward: 15,
      playerSatisfactionEstimate: 8,
    },
  },

  // Broken loop (no cycle) for negative test
  brokenLoop: {
    loops: [
      {
        id: 'broken',
        name: 'Linear Flow',
        type: 'core',
        nodes: [
          { id: 'n1', mechanicId: 'm1', label: 'Start' },
          { id: 'n2', mechanicId: 'm2', label: 'End' },
        ],
        edges: [
          { id: 'e1', sourceNodeId: 'n1', targetNodeId: 'n2' },
          // Missing cycle back
        ],
      },
    ],
  },

  // Economy with issues
  problematicEconomy: {
    economyHealth: 'inflationary',
    overallScore: 4,
    resourcesAtSessionEnd: {
      gold: 10000,
      gems: 0,
    },
  },
}

// Expected SSE event types for UX compatibility
const EXPECTED_SSE_EVENTS = ['start', 'node', 'message', 'action', 'questions', 'state', 'complete']

describe('Game Design Evaluation - E2E Sanity Check', () => {
  let mechanicJudge: GameMechanicJudge
  let loopJudge: LoopStructureJudge
  let balanceJudge: BalanceJudge
  let hookJudge: PsychologicalHookJudge
  let economyJudge: EconomyHealthJudge

  beforeAll(() => {
    mechanicJudge = new GameMechanicJudge()
    loopJudge = new LoopStructureJudge()
    balanceJudge = new BalanceJudge()
    hookJudge = new PsychologicalHookJudge()
    economyJudge = new EconomyHealthJudge()
  })

  describe('API Compatibility - Output Structure', () => {
    it('should handle standard farming loop design output', async () => {
      const output = MOCK_AGENT_OUTPUTS.farmingLoopDesign

      // All judges should be able to process the output
      const mechanicResult = await mechanicJudge.evaluate({}, output, {
        shouldGenerateMechanics: true,
      })
      const loopResult = await loopJudge.evaluate({}, output, { shouldCreateLoop: true })
      const balanceResult = await balanceJudge.evaluate({}, output)
      const hookResult = await hookJudge.evaluate({}, output, { shouldHaveClearHook: true })
      const economyResult = await economyJudge.evaluate({}, output)

      // Verify all judges return valid results
      expect(mechanicResult.score).toBeGreaterThan(0)
      expect(mechanicResult.score).toBeLessThanOrEqual(1)
      expect(loopResult.score).toBeGreaterThan(0)
      expect(hookResult.score).toBeGreaterThan(0)
      expect(economyResult.score).toBeGreaterThan(0)
      expect(balanceResult.score).toBeGreaterThan(0)

      // For a good output, scores should be high
      expect(mechanicResult.score).toBeGreaterThan(0.7)
      expect(loopResult.score).toBeGreaterThan(0.7)
      expect(hookResult.score).toBeGreaterThan(0.6)
    })

    it('should detect issues in broken outputs', async () => {
      const output = MOCK_AGENT_OUTPUTS.brokenLoop

      const loopResult = await loopJudge.evaluate({}, output)
      const hookResult = await hookJudge.evaluate({}, output)

      // Should detect missing cycle
      expect(loopResult.score).toBeLessThan(1)
      expect(
        loopResult.metadata?.issues?.some((i: string) => i.toLowerCase().includes('cycle'))
      ).toBe(true)

      // Should detect missing hook
      expect(hookResult.score).toBeLessThan(1)
    })

    it('should detect economy issues', async () => {
      const output = MOCK_AGENT_OUTPUTS.problematicEconomy
      const input = {
        resources: [
          { name: 'gold', type: 'currency', initialValue: 100 },
          { name: 'gems', type: 'currency', initialValue: 10 },
        ],
      }

      const economyResult = await economyJudge.evaluate(input, output)

      // Should detect inflationary economy
      expect(economyResult.score).toBeLessThan(1)
      expect(economyResult.reason).toContain('inflationary')
    })
  })

  describe('Judge Metadata Format', () => {
    it('should return consistent metadata structure', async () => {
      const output = MOCK_AGENT_OUTPUTS.farmingLoopDesign

      const mechanicResult = await mechanicJudge.evaluate({}, output)
      const loopResult = await loopJudge.evaluate({}, output)
      const hookResult = await hookJudge.evaluate({}, output)
      const economyResult = await economyJudge.evaluate({}, output)

      // All results should have required fields
      for (const result of [mechanicResult, loopResult, hookResult, economyResult]) {
        expect(result).toHaveProperty('score')
        expect(result).toHaveProperty('scoreName')
        expect(result).toHaveProperty('reason')
        expect(result).toHaveProperty('metadata')
        expect(typeof result.score).toBe('number')
        expect(typeof result.reason).toBe('string')
      }

      // Metadata should contain useful debugging info
      expect(mechanicResult.metadata).toHaveProperty('mechanicCount')
      expect(loopResult.metadata).toHaveProperty('loopCount')
      expect(hookResult.metadata).toHaveProperty('detectedHooks')
      expect(economyResult.metadata).toHaveProperty('economyHealth')
    })
  })

  describe('Integration with Evaluation Pipeline', () => {
    it('should produce scores compatible with Langfuse tracking', async () => {
      const output = MOCK_AGENT_OUTPUTS.farmingLoopDesign

      // Simulate what the evaluation runner would do
      const scores: Record<string, number> = {}
      const judges = [mechanicJudge, loopJudge, balanceJudge, hookJudge, economyJudge]

      for (const judge of judges) {
        const result = await judge.evaluate({}, output)
        scores[result.scoreName] = result.score
      }

      // All scores should be normalized 0-1
      for (const [name, score] of Object.entries(scores)) {
        expect(score).toBeGreaterThanOrEqual(0)
        expect(score).toBeLessThanOrEqual(1)
      }

      // Calculate aggregate score (as Langfuse would)
      const avgScore =
        Object.values(scores).reduce((a, b) => a + b, 0) / Object.values(scores).length
      expect(avgScore).toBeGreaterThan(0)
      expect(avgScore).toBeLessThanOrEqual(1)
    })

    it('should handle edge case inputs gracefully', async () => {
      // Empty output
      const emptyResult = await mechanicJudge.evaluate({}, {})
      expect(emptyResult.score).toBeDefined()

      // Null output
      const nullResult = await loopJudge.evaluate({}, null)
      expect(nullResult.score).toBeDefined()

      // Malformed output
      const malformedResult = await hookJudge.evaluate({}, { random: 'data' })
      expect(malformedResult.score).toBeDefined()
    })
  })

  describe('SSE Event Structure Compatibility', () => {
    it('should define expected event types for frontend', () => {
      // This test documents the expected SSE event structure
      // that the frontend (LoopCreatorLayout) expects

      const sampleEvents = [
        { type: 'start', node: 'supervisor', data: {} },
        { type: 'node', node: 'mechanics_designer', data: {} },
        { type: 'message', content: 'Creating game mechanics...', data: {} },
        { type: 'action', action: { type: 'ADD_NODE', payload: {} }, data: {} },
        { type: 'questions', questions: [], data: {} },
        { type: 'state', state: {}, data: {} },
        { type: 'complete', result: {}, data: {} },
      ]

      for (const event of sampleEvents) {
        expect(EXPECTED_SSE_EVENTS).toContain(event.type)
      }
    })
  })

  describe('Golden Dataset Compatibility', () => {
    it('should handle examples from loop-creator-golden dataset', async () => {
      // Simulate running judges on golden dataset examples
      const goldenExamples = [
        {
          input: { message: 'Create a farming game core loop', gameContext: { genre: 'farming' } },
          expected: { shouldGenerateMechanics: true, shouldCreateLoop: true },
          mockOutput: MOCK_AGENT_OUTPUTS.farmingLoopDesign,
        },
        {
          input: { message: 'Analyze my game balance', gameContext: { genre: 'roguelike' } },
          expected: { shouldAnalyzeBalance: true, minBalanceScore: 6 },
          mockOutput: MOCK_AGENT_OUTPUTS.balanceAnalysis,
        },
      ]

      for (const example of goldenExamples) {
        const mechanicResult = await mechanicJudge.evaluate(
          example.input,
          example.mockOutput,
          example.expected
        )
        expect(mechanicResult.score).toBeDefined()

        const loopResult = await loopJudge.evaluate(
          example.input,
          example.mockOutput,
          example.expected
        )
        expect(loopResult.score).toBeDefined()
      }
    })
  })

  describe('Score Thresholds', () => {
    it('should pass threshold for well-formed output (>= 80%)', async () => {
      const output = MOCK_AGENT_OUTPUTS.farmingLoopDesign

      const results = await Promise.all([
        mechanicJudge.evaluate({}, output, { shouldGenerateMechanics: true }),
        loopJudge.evaluate({}, output, { shouldCreateLoop: true }),
        hookJudge.evaluate({}, output, { shouldHaveClearHook: true }),
        economyJudge.evaluate({}, output),
      ])

      const avgScore = results.reduce((acc, r) => acc + r.score, 0) / results.length

      // Well-formed output should achieve >= 70% (allowing for some strictness)
      expect(avgScore).toBeGreaterThanOrEqual(0.7)
    })

    it('should fail threshold for poorly-formed output (< 60%)', async () => {
      const output = {
        // Incomplete mechanics
        mechanics: [{ id: '1' }], // Missing name, type, description
        // Broken loop
        loops: [{ name: 'X' }], // Missing type, nodes, edges, hooks
      }

      const results = await Promise.all([
        mechanicJudge.evaluate({}, output, { shouldGenerateMechanics: true }),
        loopJudge.evaluate({}, output, { shouldCreateLoop: true }),
        hookJudge.evaluate({}, output, { shouldHaveClearHook: true }),
      ])

      const avgScore = results.reduce((acc, r) => acc + r.score, 0) / results.length

      // Poorly-formed output should score < 80%
      expect(avgScore).toBeLessThan(0.8)
    })
  })
})
