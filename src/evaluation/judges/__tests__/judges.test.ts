
import { describe, it, expect } from 'vitest'
import { HaltingJudge, ConsistencyJudge, RoutingJudge } from '../' // imports from index.ts

describe('Evaluation Judges', () => {
    describe('HaltingJudge', () => {
        const judge = new HaltingJudge()

        it('should pass if halted when expected', async () => {
            const result = await judge.evaluate(
                { message: 'Why?' },
                { message: 'Awaiting user input...' },
                { shouldHalt: true }
            )
            expect(result.score).toBe(1)
        })

        it('should fail if proceeded when expected to halt', async () => {
            const result = await judge.evaluate(
                { message: 'Why?' },
                { message: 'I will do this.' },
                { shouldHalt: true }
            )
            expect(result.score).toBe(0)
        })
    })

    describe('ConsistencyJudge', () => {
        const judge = new ConsistencyJudge()

        it('should detect dead/alive contradiction', async () => {
            const result = await judge.evaluate(
                { facts: ['John is dead'] },
                'John is alive and walking.',
                {}
            )
            expect(result.score).toBe(0)
            expect(result.reason).toContain('Consistency violations')
        })

        it('should pass if consistent', async () => {
            const result = await judge.evaluate(
                { facts: ['John is dead'] },
                'John lies in the grave.',
                {}
            )
            expect(result.score).toBe(1)
        })
    })

    describe('RoutingJudge', () => {
        const judge = new RoutingJudge()

        it('should pass strict tool match', async () => {
            const result = await judge.evaluate(
                {},
                { type: 'tool-call', toolName: 'test-tool' },
                { toolName: 'test-tool' }
            )
            expect(result.score).toBe(1)
        })

        it('should pass regex/agent match', async () => {
            const result = await judge.evaluate(
                {},
                { type: 'tool-call', toolName: 'ResearchTool' },
                { expectedAgents: ['Research'] }
            )
            expect(result.score).toBe(1)
        })
    })
})
