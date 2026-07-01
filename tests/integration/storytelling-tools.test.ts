
import { describe, it, expect } from 'vitest'
import { getPlotPhaseTool, validateConsistencyTool } from '../../src/domains/storyteller/tools/storytelling-adapter'

// Helper to parse tool result whether it's a string or object
function parseResult(result: any): any {
    if (typeof result === 'string') {
        return JSON.parse(result)
    }
    return result
}

describe('Storytelling Tools Integration', () => {
    describe('getPlotPhaseTool', () => {
        it('should return correct phase for chapter 1', async () => {
            const result = await getPlotPhaseTool.execute!({ currentChapter: 1 }, {} as any)
            const parsed = parseResult(result)
            expect(parsed.phase).toBe('Ordinary World')
            expect(parsed.chapter).toBe(1)
        })

        it('should handle out of bounds chapters', async () => {
            const result = await getPlotPhaseTool.execute!({ currentChapter: 99 }, {} as any)
            const parsed = parseResult(result)
            expect(parsed.phase).toBe('Return with the Elixir') // Last phase
        })
    })

    describe('validateConsistencyTool', () => {
        it('should pass consistent beats', async () => {
            const result = await validateConsistencyTool.execute!(
                {
                    proposedBeat: 'The hero walks home.',
                    establishedFacts: ['Hero lives in a village'],
                },
                {} as any
            )
            const parsed = parseResult(result)
            expect(parsed.isConsistent).toBe(true)
        })

        it('should detect dead/alive conflicts (placeholder logic)', async () => {
            const result = await validateConsistencyTool.execute!(
                {
                    proposedBeat: 'The King is alive and well.',
                    establishedFacts: ['The King is dead'],
                },
                {} as any
            )
            const parsed = parseResult(result)
            expect(parsed.isConsistent).toBe(false)
            expect(parsed.conflicts.length).toBeGreaterThan(0)
            expect(parsed.conflicts[0]).toContain('contradicts')
        })
    })
})
