
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { ExecutiveAgent } from '../../src/agent-core/executive'
import { createPlannerTool, PlanPersistence } from '../../src/agent-core/planner'
import { researchTool } from '../../src/domains/storyteller/tools/v2/research-adapter'
import { Plan } from '../../src/agent-core/schemas'
import { registerCorePrompts } from '../../src/prompts/registry'

class MockPersistence implements PlanPersistence {
    public plan: Plan | null = null
    async loadPlan() { return this.plan }
    async savePlan(plan: Plan) { this.plan = plan }
}

describe('System Full Loop Connectivity', () => {

    // Mock global fetch using stubGlobal for isolation
    const fetchMock = vi.fn()

    beforeEach(() => {
        vi.stubGlobal('fetch', fetchMock)
        fetchMock.mockReset()
        process.env.TAVILY_API_KEY = 'test-key'
        registerCorePrompts()
    })

    afterEach(() => {
        vi.restoreAllMocks()
    })

    it('should wire Agent -> Tools -> Persistence correctly', async () => {
        // 1. Setup Planner & Persistence
        const persistence = new MockPersistence()
        const plannerTool = createPlannerTool(persistence)

        // Pre-seed a plan so we can update it
        const planId = 'plan-1'
        const taskId = 'task-1'
        persistence.plan = {
            id: planId,
            goal: 'System Test',
            items: [{ id: taskId, title: 'Research Step', status: 'pending' }],
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            version: 1
        }

        // 2. Setup Agent with Real ResearchTool
        const agent = await ExecutiveAgent.create({
            modelName: 'mock-model',
            planner: plannerTool,
            tools: [researchTool]
        })

        // 3. Mock Tavily Response
        fetchMock.mockResolvedValue({
            ok: true,
            json: async () => ({ results: [{ title: 'Test Result', url: 'http://example.com', content: 'Snippet' }] })
        })

        // 4. Manually Trigger Execution (Simulate Agent Decision)
        // We bypass the LLM loop and directly test the execution engine wiring.
        const output = await agent.executeStep(taskId, 'research_topic', {
            query: 'Connectivity Check',
            focus: 'general',
            depth: 'quick'
        })

        // 5. Verify Tool Execution
        expect(fetchMock).toHaveBeenCalled()
        expect(output).toContain('Step Executed')
        expect(output).toContain('Test Result')

        // 6. Verify Planner Update (Agent should mark task as completed)
        expect(persistence.plan).toBeDefined()
        const task = persistence.plan!.items.find(t => t.id === taskId)
        expect(task?.status).toBe('completed')
    })
})
