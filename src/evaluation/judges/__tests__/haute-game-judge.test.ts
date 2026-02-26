/**
 * Haute Game Judge Tests
 *
 * Tests for the unified evaluation framework combining:
 * - Klei's systemic elegance
 * - CDPR's narrative depth
 * - Kojima's meaningful connection
 */

import { describe, it, expect, beforeAll } from 'vitest'
import { HauteGameJudge } from '../haute-game-judge'

describe('HauteGameJudge', () => {
  let judge: HauteGameJudge

  beforeAll(() => {
    judge = new HauteGameJudge()
  })

  describe('Atomic Loom (System Elegance)', () => {
    it('should score high for elegant systems with many emergent combos', async () => {
      const output = {
        verbs: [
          {
            id: 'burn',
            name: 'Burn',
            targets: ['wood', 'creature'],
            effects: ['on_fire', 'damage'],
          },
          {
            id: 'freeze',
            name: 'Freeze',
            targets: ['water', 'creature'],
            effects: ['frozen', 'slow'],
          },
          { id: 'combine', name: 'Combine', targets: ['item', 'item'], effects: ['new_item'] },
        ],
        nouns: [
          {
            id: 'wood',
            name: 'Wood',
            properties: ['flammable'],
            states: ['normal', 'burning', 'ash'],
            category: 'resource',
          },
          {
            id: 'water',
            name: 'Water',
            properties: ['liquid'],
            states: ['normal', 'ice', 'steam'],
            category: 'resource',
          },
          {
            id: 'creature',
            name: 'Creature',
            properties: ['alive'],
            states: ['normal', 'on_fire', 'frozen'],
            category: 'entity',
          },
        ],
        rules: [
          {
            id: 'r1',
            verb: 'burn',
            noun: 'wood',
            result: 'ash',
            emergent: ['smoke_signal'],
            chainable: true,
          },
          {
            id: 'r2',
            verb: 'freeze',
            noun: 'water',
            result: 'ice',
            emergent: ['ice_bridge'],
            chainable: true,
          },
        ],
        emergentCombos: [
          { chain: ['burn+wood', 'freeze+steam'], outcome: 'rain', discoveryDifficulty: 'hidden' },
          {
            chain: ['burn+creature', 'freeze+creature'],
            outcome: 'temperature_shock',
            discoveryDifficulty: 'secret',
          },
        ],
        systemEleganceScore: 8,
      }

      const result = await judge.evaluate({}, output)
      expect(result.score).toBeGreaterThan(0.5) // With only atomic layer, score is limited
      expect(result.metadata?.scores?.systemElegance).toBeGreaterThanOrEqual(7)
    })

    it('should score lower for systems without emergence', async () => {
      const output = {
        verbs: [{ id: 'attack', name: 'Attack', targets: ['enemy'], effects: ['damage'] }],
        nouns: [
          {
            id: 'enemy',
            name: 'Enemy',
            properties: [],
            states: ['alive', 'dead'],
            category: 'entity',
          },
        ],
        rules: [
          {
            id: 'r1',
            verb: 'attack',
            noun: 'enemy',
            result: 'damage',
            emergent: [],
            chainable: false,
          },
        ],
        emergentCombos: [],
      }

      const result = await judge.evaluate({}, output)
      expect(result.metadata?.scores?.systemElegance).toBeLessThan(7)
    })
  })

  describe('Memory Keeper (Narrative Integration)', () => {
    it('should score high for deep world memory', async () => {
      const output = {
        events: [
          {
            id: 'e1',
            type: 'action',
            description: 'Saved the merchant',
            witnesses: ['guard', 'baker'],
            decayDays: 30,
            propagationRadius: 'regional',
          },
        ],
        rumors: [
          {
            id: 'rum1',
            sourceEvent: 'e1',
            currentForm: 'A stranger saved old Gregor',
            distortionLevel: 0.2,
            spreadRate: 'medium',
            factionReach: ['merchants_guild'],
          },
        ],
        questTriggers: [
          { condition: 'merchant_rep > 5', questSeed: 'Merchant offers secret job', delay: 'long' },
        ],
        worldMemoryDepth: 8,
      }

      const result = await judge.evaluate({}, output)
      expect(result.metadata?.scores?.narrativeIntegration).toBeGreaterThanOrEqual(7)
    })
  })

  describe('Grey Palette (Moral Complexity)', () => {
    it('should score high for truly difficult choices', async () => {
      const output = {
        choices: [
          {
            id: 'c1',
            situation:
              'The village needs medicine, but the only source is a bandit camp that also has innocent prisoners',
            options: [
              {
                id: 'o1',
                action: 'Raid the camp',
                immediateGain: 'Medicine',
                hiddenCost: 'Prisoners may die in crossfire',
                factionImpact: { villagers: 5, bandits: -10 },
                moralWeight: 'heavy',
              },
              {
                id: 'o2',
                action: 'Negotiate with bandits',
                immediateGain: 'Prisoners freed',
                hiddenCost: 'Must give them supplies, village suffers',
                factionImpact: { villagers: -3, bandits: 5 },
                moralWeight: 'heavy',
              },
            ],
            noGoodChoice: true,
            delayedConsequence: true,
          },
        ],
        consequences: [
          {
            triggerId: 'c1',
            immediate: ['Situation resolved'],
            shortTerm: ['Village opinion shifts'],
            longTerm: ['Bandits remember your choice'],
            permanent: ['Someone remembers what you did'],
          },
        ],
        factionTensions: [
          {
            factionA: 'villagers',
            factionB: 'bandits',
            tension: 'hostile',
            playerCanInfluence: true,
          },
        ],
        moralComplexityScore: 9,
      }

      const result = await judge.evaluate({}, output, { shouldHaveMoralChoices: true })
      expect(result.metadata?.scores?.narrativeIntegration).toBeGreaterThan(5)
    })
  })

  describe('Strand Weaver (Connection Meaning)', () => {
    it('should score high for meaningful async connections', async () => {
      const output = {
        traceTypes: [
          {
            id: 't1',
            name: 'Campfire Remains',
            persistence: 'decaying',
            visibility: 'always',
            interactable: true,
            examples: ['Provides warmth for others', 'Shows safe area'],
          },
          {
            id: 't2',
            name: 'Warning Signs',
            persistence: 'permanent',
            visibility: 'proximity',
            interactable: true,
            examples: ['Player-placed danger markers'],
          },
        ],
        legacyElements: [
          {
            id: 'l1',
            sourceType: 'death',
            element: 'Grave with gear',
            transformRules: 'Becomes lootable after 24h',
            inheritanceChance: 0.8,
          },
          {
            id: 'l2',
            sourceType: 'abandonment',
            element: 'Abandoned base',
            transformRules: 'Decays over time, attracts creatures',
            inheritanceChance: 1.0,
          },
        ],
        sharedChallenges: [
          {
            name: 'Build the Bridge',
            description: 'Community effort to span the river',
            contributionType: 'additive',
            reward: 'Faster travel for all',
          },
        ],
        connectionMeaningScore: 8,
      }

      const result = await judge.evaluate({}, output, { shouldHaveStrandConnections: true })
      expect(result.metadata?.scores?.connectionMeaning).toBeGreaterThanOrEqual(7)
    })
  })

  describe('Silent Teacher (Discovery Respect)', () => {
    it('should score high for implicit learning', async () => {
      const output = {
        scenarios: [
          {
            id: 's1',
            mechanicToTeach: 'fire_spreading',
            setupDescription: 'First area has dry grass near torch',
            failureMode: 'Grass catches fire, blocks path temporarily',
            failureSeverity: 'trivial',
            successIndicator: 'Player notices and avoids/uses fire',
            explicitInstruction: false,
          },
        ],
        breadcrumbs: [
          {
            hint: 'Charred remains near torch holders',
            mechanic: 'fire_spreading',
            obviousness: 'subtle',
          },
        ],
        safeFailureZones: [
          { location: 'Tutorial Cave', purpose: 'Practice combat basics', resetCost: 'free' },
        ],
        discoveryRespectScore: 9,
      }

      const result = await judge.evaluate({}, output)
      expect(result.metadata?.scores?.discoveryRespect).toBeGreaterThanOrEqual(7)
    })

    it('should penalize explicit tutorials', async () => {
      const output = {
        scenarios: [
          {
            id: 's1',
            mechanicToTeach: 'jumping',
            setupDescription: 'Text popup says "Press A to jump"',
            failureMode: 'Cannot progress',
            failureSeverity: 'trivial',
            successIndicator: 'Player jumps',
            explicitInstruction: true, // BAD!
          },
        ],
      }

      const result = await judge.evaluate({}, output)
      expect(result.metadata?.scores?.discoveryRespect).toBeLessThan(6)
    })
  })

  describe('Mundane Poet (Meaningful Routine)', () => {
    it('should score high for elevated mundane actions', async () => {
      const output = {
        rituals: [
          {
            id: 'r1',
            baseMechanic: 'eating',
            ritualName: 'Campfire Meal',
            steps: ['Gather ingredients', 'Prepare fire', 'Cook slowly', 'Share with companions'],
            emotionalPayoff: 'Warmth of shared humanity in harsh world',
            frequency: 'occasional',
            skipPenalty: 'Lower morale, weaker buffs',
          },
        ],
        frictionPoints: [
          {
            action: 'fast_travel',
            friction: 'Must pack camp properly',
            purpose: 'Value the journey, not just destination',
          },
        ],
        quietMoments: [
          {
            trigger: 'after_boss_fight',
            duration: '30 seconds',
            atmosphere: 'Somber reflection, wind sounds',
          },
        ],
        mundaneBeautyScore: 8,
      }

      const result = await judge.evaluate({}, output)
      expect(result.metadata?.scores?.mundaneBeauty).toBeGreaterThanOrEqual(7)
    })
  })

  describe('Combined Evaluation', () => {
    it('should evaluate full Haute Game output', async () => {
      const fullOutput = {
        atomicSystems: {
          verbs: [
            { id: 'v1', name: 'Burn' },
            { id: 'v2', name: 'Freeze' },
          ],
          nouns: [
            { id: 'n1', name: 'Wood' },
            { id: 'n2', name: 'Water' },
          ],
          rules: [{ id: 'r1', verb: 'burn', noun: 'wood' }],
          emergentCombos: [{ chain: ['burn+wood'], outcome: 'smoke' }],
          systemEleganceScore: 7,
        },
        worldMemory: {
          events: [{ id: 'e1', type: 'action' }],
          rumors: [{ id: 'rum1' }],
          questTriggers: [{ condition: 'rep > 5' }],
          worldMemoryDepth: 7,
        },
        moralChoices: {
          choices: [{ id: 'c1', noGoodChoice: true }],
          consequences: [{ triggerId: 'c1' }],
          moralComplexityScore: 8,
        },
        strandConnections: {
          traceTypes: [{ id: 't1', interactable: true }],
          legacyElements: [{ id: 'l1' }],
          sharedChallenges: [{ name: 'Build Bridge' }],
          connectionMeaningScore: 7,
        },
        implicitLearning: {
          scenarios: [{ id: 's1', explicitInstruction: false }],
          breadcrumbs: [{ hint: 'Subtle hint' }],
          safeFailureZones: [{ location: 'Safe Zone' }],
          discoveryRespectScore: 8,
        },
        meaningfulMundane: {
          rituals: [{ id: 'r1', emotionalPayoff: 'Deep satisfaction' }],
          frictionPoints: [{ action: 'travel', purpose: 'Journey matters' }],
          quietMoments: [{ trigger: 'victory' }],
          mundaneBeautyScore: 7,
        },
        wouldPlayersTellStories: true,
        storyPotentialExamples: [
          'That time I burned the forest to escape the wolves',
          'When I found another player\'s grave and it saved my life',
        ],
      }

      const result = await judge.evaluate({}, fullOutput)

      expect(result.score).toBeGreaterThan(0.6)
      expect(result.metadata?.layersPresent).toBe(6) // All 6 layers
      expect(result.metadata?.wouldPlayersTellStories).toBe(true)
    })

    it('should calculate cohesion based on layers present', async () => {
      // Only 2 layers
      const partialOutput = {
        atomicSystems: { verbs: [{ id: 'v1' }], systemEleganceScore: 7 },
        worldMemory: { events: [{ id: 'e1' }], worldMemoryDepth: 7 },
      }

      const result = await judge.evaluate({}, partialOutput)
      expect(result.metadata?.layersPresent).toBe(2)
      expect(result.metadata?.scores?.cohesion).toBeLessThan(8)
    })
  })

  describe('Story Potential Assessment', () => {
    it('should assess high story potential for rich designs', async () => {
      const output = {
        systemEleganceScore: 8,
        worldMemoryDepth: 8,
        moralComplexityScore: 9,
        connectionMeaningScore: 8,
        discoveryRespectScore: 8,
        mundaneBeautyScore: 7,
      }

      const result = await judge.evaluate({}, output)
      expect(result.metadata?.wouldPlayersTellStories).toBe(true)
    })

    it('should assess low story potential for shallow designs', async () => {
      const output = {
        systemEleganceScore: 3,
        worldMemoryDepth: 2,
        moralComplexityScore: 2,
        connectionMeaningScore: 1,
        discoveryRespectScore: 3,
        mundaneBeautyScore: 2,
      }

      const result = await judge.evaluate({}, output)
      expect(result.metadata?.wouldPlayersTellStories).toBe(false)
    })
  })

  describe('Expected Value Checks', () => {
    it('should flag missing expected elements', async () => {
      const output = {} // Empty output

      const result = await judge.evaluate({}, output, {
        shouldHaveEmergentCombos: true,
        shouldHaveMoralChoices: true,
        shouldHaveStrandConnections: true,
      })

      expect(result.metadata?.issues?.length).toBeGreaterThan(0)
      // Check that issues mention missing elements
      const issuesJoined = (result.metadata?.issues || []).join(' ').toLowerCase()
      expect(issuesJoined).toContain('missing')
    })

    it('should pass when expected elements are present', async () => {
      const output = {
        emergentCombos: [{ chain: ['burn+wood'], outcome: 'smoke' }],
        choices: [{ id: 'c1' }],
        traceTypes: [{ id: 't1' }],
      }

      const result = await judge.evaluate({}, output, {
        shouldHaveEmergentCombos: true,
        shouldHaveMoralChoices: true,
        shouldHaveStrandConnections: true,
      })

      expect(result.metadata?.issues?.length).toBe(0)
    })
  })
})
