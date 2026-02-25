
import { describe, it, expect } from 'vitest'
import {
    createIdentifyCoreLoopTool,
    createAnalyzeMechanicBalanceTool,
    createSuggestProgressionTool,
    createValidateLoopStructureTool,
} from '../../../src/domains/game-design/tools/v2/logic-transformers'
import {
    createGetLoopsTool,
    createGetLoopByIdTool,
    createGetMarketAnalysisTool,
} from '../../../src/domains/game-design/tools/v2/loop-tools'
import { GameMechanic, GameLoop } from '../../../src/domains/game-design/schemas'

// Skip if no OPENAI_API_KEY
const hasOpenAI = !!process.env.OPENAI_API_KEY

describe.skipIf(!hasOpenAI)('Game Design Logic Transformer Tools', () => {
    describe('createIdentifyCoreLoopTool', () => {
        it('should identify core loop from mechanics', async () => {
            const tool = createIdentifyCoreLoopTool()

            const mechanics: Partial<GameMechanic>[] = [
                {
                    id: crypto.randomUUID(),
                    name: 'Harvest',
                    type: 'core',
                    description: 'Collect resources from the environment',
                    transformers: [],
                    playerInteraction: 'active',
                },
                {
                    id: crypto.randomUUID(),
                    name: 'Craft',
                    type: 'core',
                    description: 'Combine resources to create items',
                    transformers: [],
                    playerInteraction: 'active',
                },
                {
                    id: crypto.randomUUID(),
                    name: 'Sell',
                    type: 'core',
                    description: 'Exchange items for currency',
                    transformers: [],
                    playerInteraction: 'active',
                },
            ]

            const result = (await tool.execute!(
                {
                    mechanics: mechanics as GameMechanic[],
                    genre: 'farming sim',
                    targetAudience: 'casual',
                },
                {} as any
            )) as any

            if (!result.success) {
                console.log('Identify core loop error:', result.error)
            }
            expect(result.success).toBe(true)
            expect(result.coreLoop).toBeDefined()
            expect(result.coreLoop.name).toBeDefined()
            expect(result.coreLoop.type).toBeDefined()
            expect(result.confidence).toBeGreaterThan(0)
        }, 60000)
    })

    describe('createAnalyzeMechanicBalanceTool', () => {
        it('should analyze balance of mechanics', async () => {
            const tool = createAnalyzeMechanicBalanceTool()

            const mechanics: Partial<GameMechanic>[] = [
                {
                    id: crypto.randomUUID(),
                    name: 'Mine Gold',
                    type: 'core',
                    description: 'Extract gold from mines',
                    transformers: [{
                        id: crypto.randomUUID(),
                        type: 'generator',
                        inputs: [],
                        outputs: [{ resourceId: 'gold', amount: 10, probability: 1 }],
                    }],
                    playerInteraction: 'active',
                },
            ]

            const resources = [
                { id: 'gold', name: 'Gold', type: 'currency' as const, initialValue: 0 },
            ]

            const result = (await tool.execute!(
                {
                    loopId: crypto.randomUUID(),
                    mechanics: mechanics as GameMechanic[],
                    resources: resources as any,
                    targetAudience: 'midcore',
                    sessionDurationMinutes: 30,
                },
                {} as any
            )) as any

            expect(result.success).toBe(true)
            expect(result.overallScore).toBeDefined()
            expect(typeof result.overallScore).toBe('number')
            expect(result.economyHealth).toBeDefined()
        }, 60000)
    })

    describe('createSuggestProgressionTool', () => {
        it('should suggest progression improvements', async () => {
            const tool = createSuggestProgressionTool()

            const loop: Partial<GameLoop> = {
                id: crypto.randomUUID(),
                projectId: crypto.randomUUID(),
                name: 'Basic Farming Loop',
                type: 'core',
                nodes: [
                    { id: '1', mechanicId: 'm1', label: 'Plant' },
                    { id: '2', mechanicId: 'm2', label: 'Water' },
                    { id: '3', mechanicId: 'm3', label: 'Harvest' },
                ],
                edges: [
                    { id: 'e1', sourceNodeId: '1', targetNodeId: '2', weight: 1 },
                    { id: 'e2', sourceNodeId: '2', targetNodeId: '3', weight: 1 },
                    { id: 'e3', sourceNodeId: '3', targetNodeId: '1', weight: 1 },
                ],
                resources: [],
            }

            const result = (await tool.execute!(
                {
                    currentLoop: loop as GameLoop,
                    expansionDirection: 'depth',
                    genre: 'farming sim',
                    targetAudience: 'casual',
                },
                {} as any
            )) as any

            expect(result.success).toBe(true)
            expect(result.suggestions).toBeDefined()
            expect(Array.isArray(result.suggestions)).toBe(true)
            expect(result.overallDirection).toBeDefined()
        }, 60000)
    })

    describe('createValidateLoopStructureTool', () => {
        it('should validate a well-formed loop structure', async () => {
            const tool = createValidateLoopStructureTool()

            const mechanicId1 = crypto.randomUUID()
            const mechanicId2 = crypto.randomUUID()
            const mechanicId3 = crypto.randomUUID()

            const loop: Partial<GameLoop> = {
                id: crypto.randomUUID(),
                projectId: crypto.randomUUID(),
                name: 'Test Loop',
                type: 'core',
                nodes: [
                    { id: 'n1', mechanicId: mechanicId1, label: 'Start' },
                    { id: 'n2', mechanicId: mechanicId2, label: 'Middle' },
                    { id: 'n3', mechanicId: mechanicId3, label: 'End' },
                ],
                edges: [
                    { id: 'e1', sourceNodeId: 'n1', targetNodeId: 'n2', weight: 1 },
                    { id: 'e2', sourceNodeId: 'n2', targetNodeId: 'n3', weight: 1 },
                    { id: 'e3', sourceNodeId: 'n3', targetNodeId: 'n1', weight: 1 }, // Creates a cycle
                ],
                resources: [],
            }

            const mechanics: Partial<GameMechanic>[] = [
                { id: mechanicId1, name: 'Start', type: 'core', description: 'Start', transformers: [], playerInteraction: 'active' },
                { id: mechanicId2, name: 'Middle', type: 'core', description: 'Middle', transformers: [], playerInteraction: 'active' },
                { id: mechanicId3, name: 'End', type: 'core', description: 'End', transformers: [], playerInteraction: 'active' },
            ]

            const result = (await tool.execute!(
                {
                    loop: loop as GameLoop,
                    mechanics: mechanics as GameMechanic[],
                },
                {} as any
            )) as any

            expect(result.success).toBe(true)
            expect(result.isValid).toBe(true)
            expect(result.metrics.cycleDetected).toBe(true)
            expect(result.metrics.nodeCount).toBe(3)
            expect(result.metrics.edgeCount).toBe(3)
        }, 60000)

        it('should detect orphan nodes', async () => {
            const tool = createValidateLoopStructureTool()

            const mechanicId1 = crypto.randomUUID()
            const mechanicId2 = crypto.randomUUID()

            const loop: Partial<GameLoop> = {
                id: crypto.randomUUID(),
                projectId: crypto.randomUUID(),
                name: 'Test Loop',
                type: 'core',
                nodes: [
                    { id: 'n1', mechanicId: mechanicId1, label: 'Connected' },
                    { id: 'n2', mechanicId: mechanicId2, label: 'Orphan' }, // No edges
                ],
                edges: [],
                resources: [],
            }

            const mechanics: Partial<GameMechanic>[] = [
                { id: mechanicId1, name: 'Connected', type: 'core', description: 'Connected', transformers: [], playerInteraction: 'active' },
                { id: mechanicId2, name: 'Orphan', type: 'core', description: 'Orphan', transformers: [], playerInteraction: 'active' },
            ]

            const result = (await tool.execute!(
                {
                    loop: loop as GameLoop,
                    mechanics: mechanics as GameMechanic[],
                },
                {} as any
            )) as any

            expect(result.success).toBe(true)
            expect(result.issues.length).toBeGreaterThan(0)
            expect(result.issues.some((i: any) => i.type === 'orphan_node')).toBe(true)
        }, 60000)
    })
})

describe('Game Design Data Tools', () => {
    // These tests require database connection, skip if not available
    const hasDatabase = !!process.env.DATABASE_URL

    describe.skipIf(!hasDatabase)('createGetLoopsTool', () => {
        it('should be callable', async () => {
            const tool = createGetLoopsTool()
            expect(tool).toBeDefined()
            expect(tool.id).toBe('get_game_loops')
        })
    })

    describe.skipIf(!hasDatabase)('createGetLoopByIdTool', () => {
        it('should be callable', async () => {
            const tool = createGetLoopByIdTool()
            expect(tool).toBeDefined()
            expect(tool.id).toBe('get_game_loop_by_id')
        })
    })

    describe.skipIf(!hasDatabase)('createGetMarketAnalysisTool', () => {
        it('should be callable', async () => {
            const tool = createGetMarketAnalysisTool()
            expect(tool).toBeDefined()
            expect(tool.id).toBe('get_market_analysis')
        })
    })
})
