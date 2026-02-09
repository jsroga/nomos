
import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { GameDesignAgent } from '../../../src/domains/game-design/agent'
import { GameDesignMemory, createGameDesignMemory } from '../../../src/domains/game-design/memory'
import { PlanPersistence } from '../../../src/agent-core/planner'

// Skip if no OPENAI_API_KEY
const hasOpenAI = !!process.env.OPENAI_API_KEY
const hasDatabase = !!process.env.DATABASE_URL

// In-memory plan persistence for testing
class InMemoryPlanPersistence implements PlanPersistence {
    private plan: any = null

    async loadPlan() {
        return this.plan
    }

    async savePlan(plan: any) {
        this.plan = plan
    }
}

// Helper to validate agent response is not an error
function assertNotError(result: any) {
    // If FINISH type with error payload, fail the test
    if (result.type === 'FINISH' && result.payload?.result?.startsWith('Error:')) {
        throw new Error(`Agent returned error: ${result.payload.result}`)
    }
    // Check thought doesn't indicate an error
    if (result.thought?.toLowerCase().includes('error') && result.thought?.toLowerCase().includes('failed')) {
        throw new Error(`Agent thought indicates error: ${result.thought}`)
    }
}

describe.skipIf(!hasOpenAI)('GameDesignAgent', () => {
    let agent: GameDesignAgent
    let persistence: InMemoryPlanPersistence

    beforeAll(async () => {
        persistence = new InMemoryPlanPersistence()
        agent = await GameDesignAgent.create({
            modelName: 'openai:gpt-4o',
            persistence,
        })
    })

    describe('Agent Creation', () => {
        it('should create an agent instance', () => {
            expect(agent).toBeDefined()
            expect(agent).toBeInstanceOf(GameDesignAgent)
        })
    })

    describe('designLoop', () => {
        it('should propose a game loop design for a farming sim', async () => {
            const result = await agent.designLoop({
                genre: 'farming simulation',
                targetAudience: 'casual',
                theme: 'cozy countryside',
                loopType: 'core',
            })

            expect(result).toBeDefined()
            expect(result.type).toBeDefined()
            expect(['ASK_USER', 'EXECUTE_STEP', 'PROPOSE_PLAN', 'FINISH']).toContain(result.type)

            // Ensure it's not an error response
            assertNotError(result)

            // If FINISH, payload should have meaningful result
            if (result.type === 'FINISH') {
                expect(result.payload?.result).toBeDefined()
                expect(result.payload.result.length).toBeGreaterThan(50)
            }
        }, 60000)

        it('should propose a game loop for a roguelike', async () => {
            const result = await agent.designLoop({
                genre: 'roguelike',
                targetAudience: 'hardcore',
                loopType: 'core',
                referenceGames: ['Hades', 'Dead Cells'],
            })

            expect(result).toBeDefined()
            expect(result.type).toBeDefined()
            assertNotError(result)
        }, 60000)
    })

    describe('runWithContext', () => {
        it('should run with project context', async () => {
            const result = await agent.runWithContext({
                projectId: crypto.randomUUID(),
                genre: 'puzzle game',
                targetAudience: 'casual',
                userMessage: 'Design a simple match-3 core loop',
            })

            expect(result).toBeDefined()
            expect(result.type).toBeDefined()
            assertNotError(result)
        }, 60000)
    })
})

describe.skipIf(!hasOpenAI || !hasDatabase)('GameDesignAgent with Memory', () => {
    let agent: GameDesignAgent
    let memory: GameDesignMemory
    let persistence: InMemoryPlanPersistence

    beforeAll(async () => {
        persistence = new InMemoryPlanPersistence()
        memory = createGameDesignMemory(process.env.DATABASE_URL || 'postgres://localhost:5432/test')

        // Seed some patterns
        await memory.addPatterns([
            {
                id: crypto.randomUUID(),
                title: 'Harvest-Craft-Sell Loop',
                description: 'Classic farming loop where players gather resources, craft items, and sell for profit',
                category: 'loop',
                tags: ['farming', 'economy', 'casual'],
                examples: ['Stardew Valley', 'Harvest Moon'],
            },
            {
                id: crypto.randomUUID(),
                title: 'Risk-Reward Balance',
                description: 'Higher risk actions should yield proportionally higher rewards',
                category: 'balance',
                tags: ['balance', 'economy', 'engagement'],
            },
        ])

        agent = await GameDesignAgent.create({
            modelName: 'openai:gpt-4o',
            persistence,
            memory,
        })
    })

    afterAll(async () => {
        if (memory) {
            await memory.disconnect()
        }
    })

    it('should retrieve relevant patterns when designing', async () => {
        const result = await agent.runWithContext({
            projectId: crypto.randomUUID(),
            genre: 'farming sim',
            targetAudience: 'casual',
            userMessage: 'Design a harvest and craft loop similar to Stardew Valley',
        })

        expect(result).toBeDefined()
        assertNotError(result)
        // The agent should have access to the seeded patterns via memory
    }, 60000)
})

describe.skipIf(!hasOpenAI)('GameDesignAgent - Harvest-Craft-Sell Loop', () => {
    let agent: GameDesignAgent
    let persistence: InMemoryPlanPersistence

    beforeAll(async () => {
        persistence = new InMemoryPlanPersistence()
        agent = await GameDesignAgent.create({
            modelName: 'openai:gpt-4o',
            persistence,
        })
    })

    it('should be able to define a Harvest -> Craft -> Sell loop', async () => {
        const result = await agent.designLoop({
            genre: 'farming simulation',
            targetAudience: 'casual',
            theme: 'medieval village economy',
            loopType: 'core',
        })

        expect(result).toBeDefined()
        expect(result.type).toBeDefined()
        expect(['ASK_USER', 'EXECUTE_STEP', 'PROPOSE_PLAN', 'FINISH']).toContain(result.type)

        // Must not be an error
        assertNotError(result)

        // Check that the response includes some game design content
        if (result.thought) {
            expect(result.thought.length).toBeGreaterThan(0)
        }

        console.log('Agent Response Type:', result.type)
        console.log('Agent Thought:', result.thought?.substring(0, 200) + '...')
        console.log('Agent Payload:', JSON.stringify(result.payload, null, 2).substring(0, 500) + '...')
    }, 90000)

    it('should analyze a proposed loop structure', async () => {
        // First, ask agent to analyze an existing loop concept
        const result = await agent.runWithContext({
            projectId: crypto.randomUUID(),
            genre: 'farming simulation',
            targetAudience: 'casual',
            existingMechanics: [
                {
                    id: crypto.randomUUID(),
                    name: 'Harvest Crops',
                    type: 'core',
                    description: 'Collect mature crops from fields',
                    transformers: [],
                    playerInteraction: 'active',
                } as any,
                {
                    id: crypto.randomUUID(),
                    name: 'Craft Goods',
                    type: 'core',
                    description: 'Transform raw materials into valuable goods',
                    transformers: [],
                    playerInteraction: 'active',
                } as any,
                {
                    id: crypto.randomUUID(),
                    name: 'Sell at Market',
                    type: 'core',
                    description: 'Exchange goods for currency',
                    transformers: [],
                    playerInteraction: 'active',
                } as any,
            ],
            userMessage: 'Analyze these mechanics and identify how they form a core loop. What is the psychological hook?',
        })

        expect(result).toBeDefined()
        expect(result.type).toBeDefined()
        assertNotError(result)

        console.log('Analysis Response Type:', result.type)
        console.log('Analysis Thought:', result.thought?.substring(0, 300) + '...')
    }, 90000)
})
