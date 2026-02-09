import { describe, it, expect } from 'vitest'
import { getPlotPhaseTool, validateConsistencyTool } from '../storytelling-adapter'

describe('Storytelling Tools (v2)', () => {
  describe('get_plot_phase', () => {
    it('should return correct phase for chapter 1', async () => {
      const result = await getPlotPhaseTool.execute({
        context: { currentChapter: 1 },
        runtimeContext: undefined as any,
      })
      const parsed = JSON.parse(result as string)
      expect(parsed.phase).toBe('Ordinary World')
      expect(parsed.chapter).toBe(1)
    })

    it('should cap at the last phase', async () => {
      const result = await getPlotPhaseTool.execute({
        context: { currentChapter: 100 },
        runtimeContext: undefined as any,
      })
      const parsed = JSON.parse(result as string)
      expect(parsed.phase).toBe('Return with the Elixir')
    })
  })

  describe('validate_plot_consistency', () => {
    it('should detect dead/alive conflict', async () => {
      const result = await validateConsistencyTool.execute({
        context: {
          proposedBeat: 'John visits the store alive.',
          establishedFacts: ['John is dead'],
        },
        runtimeContext: undefined as any,
      })
      const parsed = JSON.parse(result as string)
      expect(parsed.isConsistent).toBe(false)
      expect(parsed.conflicts.length).toBeGreaterThan(0)
    })

    it('should pass if no conflict', async () => {
      const result = await validateConsistencyTool.execute({
        context: {
          proposedBeat: 'Mary visits the store.',
          establishedFacts: ['John is dead'],
        },
        runtimeContext: undefined as any,
      })
      const parsed = JSON.parse(result as string)
      expect(parsed.isConsistent).toBe(true)
    })
  })
})
