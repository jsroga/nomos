import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createStorytellerAgent } from '../storyteller-agent'

// Mock Voyage
vi.mock('@/infrastructure/ai/embeddings/voyage-embeddings', () => ({
    getVoyageEmbeddings: vi.fn(() => ({
        embedQuery: vi.fn().mockResolvedValue(new Array(1024).fill(0)),
        embedDocuments: vi.fn().mockResolvedValue([new Array(1024).fill(0)]),
    })),
}))

// Mock Console to keep output clean
// Console mocks removed for debugging

// Mock DB
vi.mock('@/lib/db', () => ({
    db: {
        select: vi.fn(() => ({
            from: vi.fn((table: any) => ({
                where: vi.fn().mockImplementation(() => {
                    const projectMock = [{
                        id: 'test-project-id',
                        storyPlan: {},
                        seriesBible: {},
                        // Add character fields just in case it hits the update path
                        role: 'Protagonist',
                        psychology: {}
                    }]

                    // Return a thenable object that also has .limit()
                    return {
                        then: (resolve: any) => resolve(projectMock),
                        limit: vi.fn().mockResolvedValue([]) // Character query returns empty to trigger insert
                    }
                })
            }))
        })),
        insert: vi.fn(() => ({
            values: vi.fn().mockResolvedValue({})
        })),
        update: vi.fn(() => ({
            set: vi.fn(() => ({
                where: vi.fn().mockResolvedValue({})
            }))
        }))
    }
}))

describe('Storyteller Agent - Multiple Intents E2E', () => {
    let agent: any

    beforeEach(async () => {
        // Create agent with defaults
        agent = await createStorytellerAgent()
    })

    it('should handle updating plot twists and creating a character in one request', async () => {
        // Mock the agent's generate method to simulate the LLM response
        // We want to simulate the LLM choosing to call 'update_world_bible' with both fields
        const mockToolCall = {
            toolName: 'update_world_bible',
            args: {
                projectId: 'test-project-id',
                plotTwists: [{ title: 'The Betrayal', description: 'Et tu, Brute?' }],
                cast: [{ name: 'Caesar', role: 'Protagonist', description: 'Emperor', gender: 'Male', mbti: 'ENTJ' }]
            }
        }

        // We spy on the agent's run method to intercept the LLM call if possible,
        // but since 'run' calls 'agent.generate', mocking 'agent.generate' is deeper.
        // However, 'agent.generate' returns a response object.
        // In a real E2E we'd hit the LLM, but for this test we want to verify the *logic* 
        // that allows processing multiple intents if the LLM returns them.

        // Actually, if we want to test that the *agent configuration* allows this,
        // we should check if the tool definition supports these fields.

        // Debug logging
        console.log('Agent keys:', Object.keys(agent))
        if (agent.agent) {
            console.log('Inner Agent keys:', Object.keys(agent.agent))
        }

        // Access toolsMap directly (it's a private property of StorytellerAgent, but accessible via any in tests)
        const tools = agent.toolsMap || agent.agent?.tools

        if (!tools) {
            throw new Error('Could not find tools on agent instance')
        }

        const updateWorldBibleTool = tools.update_world_bible

        expect(updateWorldBibleTool).toBeDefined()

        // Execute the tool directly with multiple fields to verify the tool handles it
        // Note: createTool enforces schema validation on input. 
        // We pass the args directly as the agent would.
        const rawResult = await updateWorldBibleTool.execute(mockToolCall.args)

        console.log('Raw result type:', typeof rawResult)
        if (typeof rawResult === 'object') console.log('Raw result keys:', Object.keys(rawResult))

        const result = typeof rawResult === 'string' ? JSON.parse(rawResult) : rawResult

        console.log('Result 1:', JSON.stringify(result, null, 2))
        if (!result.success) {
            console.error('Tool execution failed:', result.error)
        }
        expect(result.success).toBe(true)

        // Verify the tool result contains both updates
        expect(result.updatedFields).toHaveProperty('plotTwists')
        expect(result.updatedFields).toHaveProperty('keyCharacters')
        expect(result.updatedFields.plotTwists).toHaveLength(1)
        expect(result.updatedFields.keyCharacters).toHaveLength(1)
        expect(result.success).toBe(true)
    })

    it('should handle sequential tool calls (simulated)', async () => {
        // This test simulates the agent making two separate tool calls in sequence
        // distinct from the bundled call above.

        const tools = agent.toolsMap || agent.agent?.tools
        const updateWorldBibleTool = tools.update_world_bible

        // Call 1: Update Plot Twists
        const rawResult1 = await updateWorldBibleTool.execute({
            projectId: 'test-project-id',
            plotTwists: [{ title: 'Twist 1', description: 'Desc 1' }]
        })
        const result1 = typeof rawResult1 === 'string' ? JSON.parse(rawResult1) : rawResult1

        expect(result1.updatedFields).toHaveProperty('plotTwists')
        expect(result1.updatedFields).not.toHaveProperty('cast')

        // Call 2: Update Cast
        const rawResult2 = await updateWorldBibleTool.execute({
            projectId: 'test-project-id',
            cast: [{ name: 'Char 1', role: 'Role 1', description: 'Desc 1', gender: 'Female', mbti: 'INTJ' }]
        })
        const result2 = typeof rawResult2 === 'string' ? JSON.parse(rawResult2) : rawResult2

        expect(result2.updatedFields).toHaveProperty('keyCharacters')
        expect(result2.updatedFields).not.toHaveProperty('plotTwists')
    })
})
