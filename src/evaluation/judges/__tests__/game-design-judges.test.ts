/**
 * Game Design Judges Tests
 *
 * Comprehensive tests for game mechanic, loop structure, balance,
 * psychological hook, and economy health judges.
 */

import { describe, it, expect } from 'vitest'
import { GameMechanicJudge } from '../game-mechanic-judge'
import { LoopStructureJudge } from '../loop-structure-judge'
import { BalanceJudge } from '../balance-judge'
import { PsychologicalHookJudge } from '../psychological-hook-judge'
import { EconomyHealthJudge } from '../economy-health-judge'

describe('Game Design Judges', () => {
    describe('GameMechanicJudge', () => {
        const judge = new GameMechanicJudge()

        it('should pass valid mechanics', async () => {
            const output = {
                mechanics: [
                    {
                        id: 'mech-1',
                        name: 'Harvest Crops',
                        type: 'core',
                        description: 'Player collects mature crops from their farm plots',
                        playerInteraction: 'active',
                        balanceFactors: { effort: 3, reward: 5, frequency: 10 }
                    }
                ]
            }

            const result = await judge.evaluate({}, output, { shouldGenerateMechanics: true })
            expect(result.score).toBeGreaterThan(0.8)
        })

        it('should fail mechanics without names', async () => {
            const output = {
                mechanics: [
                    {
                        id: 'mech-1',
                        type: 'core',
                        description: 'A mechanic'
                    }
                ]
            }

            const result = await judge.evaluate({}, output, { shouldGenerateMechanics: true })
            expect(result.score).toBeLessThan(1)
            expect(result.reason).toContain('Missing name')
        })

        it('should detect invalid mechanic types', async () => {
            const output = {
                mechanics: [
                    {
                        name: 'Test',
                        type: 'invalid_type',
                        description: 'A test mechanic for validation'
                    }
                ]
            }

            const result = await judge.evaluate({}, output)
            expect(result.score).toBeLessThan(1)
            expect(result.reason).toContain('Unknown mechanic type')
        })

        it('should check expected mechanic types', async () => {
            const output = {
                mechanics: [
                    { name: 'Gather', type: 'core', description: 'Gather resources' }
                ]
            }

            const result = await judge.evaluate(
                {},
                output,
                { expectedMechanicTypes: ['crafting', 'trading'] }
            )
            expect(result.score).toBeLessThan(1)
            expect(result.reason).toContain('Missing expected mechanic types')
        })
    })

    describe('LoopStructureJudge', () => {
        const judge = new LoopStructureJudge()

        it('should pass valid loop structure', async () => {
            const output = {
                loops: [
                    {
                        name: 'Core Farming Loop',
                        type: 'core',
                        psychologicalHook: 'The satisfaction of watching crops grow and harvesting them',
                        nodes: [
                            { id: 'n1', mechanicId: 'm1', label: 'Plant' },
                            { id: 'n2', mechanicId: 'm2', label: 'Wait' },
                            { id: 'n3', mechanicId: 'm3', label: 'Harvest' }
                        ],
                        edges: [
                            { id: 'e1', sourceNodeId: 'n1', targetNodeId: 'n2' },
                            { id: 'e2', sourceNodeId: 'n2', targetNodeId: 'n3' },
                            { id: 'e3', sourceNodeId: 'n3', targetNodeId: 'n1' } // Cycle back
                        ]
                    }
                ]
            }

            const result = await judge.evaluate({}, output, { shouldCreateLoop: true })
            expect(result.score).toBeGreaterThan(0.7)
        })

        it('should detect orphan nodes', async () => {
            const output = {
                loops: [
                    {
                        name: 'Broken Loop',
                        type: 'core',
                        nodes: [
                            { id: 'n1', mechanicId: 'm1', label: 'Start' },
                            { id: 'n2', mechanicId: 'm2', label: 'Orphan' } // No edges
                        ],
                        edges: []
                    }
                ]
            }

            const result = await judge.evaluate({}, output)
            expect(result.score).toBeLessThan(1)
            // Check that issues array contains a string with 'Orphan node'
            expect(result.metadata?.issues?.some((i: string) => i.includes('Orphan node'))).toBe(true)
        })

        it('should detect missing cycles', async () => {
            const output = {
                loops: [
                    {
                        name: 'Linear Flow',
                        type: 'core',
                        nodes: [
                            { id: 'n1', mechanicId: 'm1', label: 'Start' },
                            { id: 'n2', mechanicId: 'm2', label: 'End' }
                        ],
                        edges: [
                            { id: 'e1', sourceNodeId: 'n1', targetNodeId: 'n2' }
                            // No cycle back
                        ]
                    }
                ]
            }

            const result = await judge.evaluate({}, output)
            expect(result.score).toBeLessThan(1)
            // Check that issues array contains a string with 'cycle'
            expect(result.metadata?.issues?.some((i: string) => i.toLowerCase().includes('cycle'))).toBe(true)
        })

        it('should validate coreLoop from identify_core_loop tool', async () => {
            const output = {
                coreLoop: {
                    name: 'Harvest-Craft-Sell',
                    type: 'core',
                    mechanics: ['harvest', 'craft', 'sell'],
                    cycleDuration: { min: 30, max: 120, unit: 'seconds' },
                    psychologicalHook: 'The satisfaction of turning raw materials into profit'
                }
            }

            const result = await judge.evaluate({}, output, { shouldCreateLoop: true })
            expect(result.score).toBeGreaterThan(0.6)
        })
    })

    describe('BalanceJudge', () => {
        const judge = new BalanceJudge()

        it('should pass healthy balance analysis', async () => {
            const output = {
                overallScore: 8,
                economyHealth: 'healthy',
                issues: [],
                simulationResults: {
                    timeToFirstReward: 15,
                    playerSatisfactionEstimate: 7
                }
            }

            const result = await judge.evaluate(
                { targetAudience: 'casual' },
                output,
                { minBalanceScore: 7 }
            )
            expect(result.score).toBeGreaterThan(0.8)
        })

        it('should detect inflationary economy', async () => {
            const output = {
                economyHealth: 'inflationary',
                overallScore: 4
            }

            const result = await judge.evaluate({}, output)
            expect(result.score).toBeLessThan(1)
            expect(result.reason).toContain('inflationary')
        })

        it('should flag low balance scores', async () => {
            const output = {
                overallScore: 3,
                economyHealth: 'broken'
            }

            const result = await judge.evaluate({}, output, { minBalanceScore: 6 })
            expect(result.score).toBeLessThan(0.5)
        })

        it('should check mechanic effort/reward ratios', async () => {
            const input = {
                mechanics: [
                    {
                        name: 'Grind Task',
                        type: 'core',
                        balanceFactors: { effort: 9, reward: 2, frequency: 100 }
                    }
                ],
                targetAudience: 'casual'
            }

            const result = await judge.evaluate(input, {})
            expect(result.score).toBeLessThan(1)
            expect(result.reason).toContain('effort')
        })
    })

    describe('PsychologicalHookJudge', () => {
        const judge = new PsychologicalHookJudge()

        it('should pass loops with clear hooks', async () => {
            const output = {
                loops: [
                    {
                        name: 'Daily Login',
                        type: 'compulsion',
                        psychologicalHook: 'Variable rewards create excitement through surprise loot boxes and daily bonuses',
                        playerExperience: 'Anticipation and excitement when opening rewards',
                        satisfactionPeak: 'When receiving a rare item from the daily reward'
                    }
                ]
            }

            const result = await judge.evaluate({}, output, { shouldHaveClearHook: true })
            expect(result.score).toBeGreaterThan(0.7)
            expect(result.metadata?.detectedHooks).toContain('variable_reward')
        })

        it('should detect missing hooks', async () => {
            const output = {
                loops: [
                    {
                        name: 'Basic Loop',
                        type: 'core'
                        // No psychologicalHook
                    }
                ]
            }

            const result = await judge.evaluate({}, output)
            expect(result.score).toBeLessThan(1)
            // Check that issues array contains a string about missing psychological hook
            expect(result.metadata?.issues?.some((i: string) => i.toLowerCase().includes('psychological hook'))).toBe(true)
        })

        it('should identify multiple hook types', async () => {
            const output = {
                loops: [
                    {
                        name: 'Social Progress',
                        type: 'social',
                        psychologicalHook: 'Progress through levels while competing with friends on the leaderboard. Collect achievements to show off.',
                        playerExperience: 'Pride in achievements and social status'
                    }
                ]
            }

            const result = await judge.evaluate({}, output)
            expect(result.metadata?.detectedHooks).toContain('progression')
            expect(result.metadata?.detectedHooks).toContain('social')
            expect(result.metadata?.detectedHooks).toContain('collection')
        })

        it('should flag potentially exploitative patterns', async () => {
            const output = {
                loops: [
                    {
                        name: 'Whale Trap',
                        type: 'monetization',
                        psychologicalHook: 'Gambling mechanics to exploit whale players'
                    }
                ]
            }

            const result = await judge.evaluate({}, output)
            expect(result.score).toBeLessThan(0.8)
            // Check that issues array contains a string about exploitative patterns
            expect(result.metadata?.issues?.some((i: string) => i.toLowerCase().includes('exploitative'))).toBe(true)
        })
    })

    describe('EconomyHealthJudge', () => {
        const judge = new EconomyHealthJudge()

        it('should pass healthy economy', async () => {
            const output = {
                economyHealth: 'healthy',
                resourcesAtSessionEnd: {
                    gold: 150,
                    gems: 5
                }
            }

            const input = {
                resources: [
                    { name: 'gold', type: 'currency', initialValue: 100 },
                    { name: 'gems', type: 'currency', initialValue: 3 }
                ],
                targetAudience: 'casual'
            }

            const result = await judge.evaluate(input, output)
            expect(result.score).toBeGreaterThan(0.8)
        })

        it('should detect broken economy', async () => {
            const output = {
                economyHealth: 'broken'
            }

            const result = await judge.evaluate({}, output)
            expect(result.score).toBeLessThan(0.6)
            expect(result.reason).toContain('broken')
        })

        it('should check resource depletion', async () => {
            // The judge needs economyHealth to be defined to extract the analysis
            const output = {
                economyHealth: 'healthy',
                resourcesAtSessionEnd: {
                    energy: 0
                }
            }

            const input = {
                resources: [
                    { name: 'energy', type: 'stat', initialValue: 100 }
                ]
            }

            const result = await judge.evaluate(input, output)
            expect(result.score).toBeLessThan(1)
            // Check that issues array contains a string about depleted resources
            expect(result.metadata?.issues?.some((i: string) => i.toLowerCase().includes('depleted'))).toBe(true)
        })

        it('should check for missing sinks', async () => {
            const input = {
                resources: [
                    { name: 'gold', generationRate: 100, consumptionRate: 0 }
                ]
            }

            const result = await judge.evaluate(input, {}, { shouldHaveSinks: true })
            expect(result.score).toBeLessThan(1)
            expect(result.reason).toContain('sinks')
        })
    })
})
