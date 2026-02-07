
import { describe, it, expect } from 'vitest'
import { getPlotPhaseTool, validateConsistencyTool } from '../../src/domains/storyteller/tools/v2/storytelling-adapter'

describe('Storytelling Tools Integration', () => {
    describe('getPlotPhaseTool', () => {
        it('should return correct phase for chapter 1', async () => {
            const result = await getPlotPhaseTool.execute({
                context: { currentChapter: 1 }
            })
            const parsed = JSON.parse(result as string)
            expect(parsed.phase).toBe('Ordinary World')
            expect(parsed.chapter).toBe(1)
        })

        it('should handle out of bounds chapters', async () => {
            const result = await getPlotPhaseTool.execute({
                context: { currentChapter: 99 }
            })
            const parsed = JSON.parse(result as string)
            expect(parsed.phase).toBe('Return with the Elixir') // Last phase
        })
    })

    describe('validateConsistencyTool', () => {
        it('should pass consistent beats', async () => {
            const result = await validateConsistencyTool.execute({
                context: {
                    proposedBeat: 'The hero walks home.',
                    establishedFacts: ['Hero lives in a village']
                }
            })
            const parsed = JSON.parse(result as string)
            expect(parsed.isConsistent).toBe(true)
        })

        it('should detect dead/alive conflicts (placeholder logic)', async () => {
            const result = await validateConsistencyTool.execute({
                context: {
                    proposedBeat: 'The King is alive and well.',
                    establishedFacts: ['The King is dead']
                }
            })
            const parsed = JSON.parse(result as string)
            expect(parsed.isConsistent).toBe(false)
            expect(parsed.conflicts.length).toBeGreaterThan(0)
            expect(parsed.conflicts[0]).toContain('contradicts')
        })
    })
})
