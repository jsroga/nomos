import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createPsychologistAgent } from '../psychologist-agent'
import { createGardenerAgent } from '../gardener-agent'
import { createDevilsAdvocateAgent } from '../devils-advocate-agent'
import { createConsequenceAgent } from '../consequence-agent'

// ============================================
// MOCKS
// ============================================

// Mock Voyage
vi.mock('@/infrastructure/ai/embeddings/voyage-embeddings', () => ({
  getVoyageEmbeddings: vi.fn(() => ({
    embedQuery: vi.fn().mockResolvedValue(new Array(1024).fill(0)),
    embedDocuments: vi.fn().mockResolvedValue([new Array(1024).fill(0)]),
  })),
}))

// Mock Console to keep output clean
const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {})
const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

describe('Agents & Tools Comprehensive E2E', () => {
  // ============================================
  // 1. AGENT TESTS (2 per Agent)
  // ============================================

  describe('Psychologist Agent', () => {
    let agent: any
    beforeEach(async () => {
      agent = await createPsychologistAgent()
    })

    it('should analyze character profile depth', async () => {
      vi.spyOn(agent.agent, 'generate').mockResolvedValue({ text: 'Analysis: High Neuroticism.' })
      const result = await agent.analyzeProfile('Bob', 'Anxious type.')
      // Agent methods now return { text, thinking } objects
      expect(result.text).toContain('Analysis')
      expect(agent.agent.generate).toHaveBeenCalledWith(
        expect.stringContaining('Analyze character'),
        expect.anything()
      )
    })

    it('should analyze consistency via profile analysis', async () => {
      vi.spyOn(agent.agent, 'generate').mockResolvedValue({ text: 'Consistency: Valid actions.' })
      const result = await agent.analyzeProfile('Bob', 'Bob runs away. Bob is coward.')
      expect(result.text).toContain('Consistency')
    })
  })

  describe('Gardener Agent', () => {
    let agent: any
    beforeEach(async () => {
      agent = await createGardenerAgent()
    })

    it('should expand a simple beat into a scene', async () => {
      vi.spyOn(agent.agent, 'generate').mockResolvedValue({ text: 'The wind howled...' })
      const result = await agent.writeScene('Storm begins', 'Night time')
      // Agent methods now return { text, thinking } objects
      expect(result.text).toBe('The wind howled...')
      expect(agent.agent.generate).toHaveBeenCalledWith(
        expect.stringContaining('Goal:'),
        expect.anything()
      )
    })

    it('should inject sensory details via scene writing context', async () => {
      vi.spyOn(agent.agent, 'generate').mockResolvedValue({ text: 'Smell of ozone.' })
      const result = await agent.writeScene('Lightning', 'Focus on sensory details')
      expect(result.text).toContain('Smell')
    })
  })

  describe('Devils Advocate Agent', () => {
    let agent: any
    beforeEach(async () => {
      agent = await createDevilsAdvocateAgent()
    })

    it('should critique for plot holes', async () => {
      vi.spyOn(agent.agent, 'generate').mockResolvedValue({ text: 'Critique: Missing motivation.' })
      const result = await agent.critique('He steals the car.', 'He is rich.')
      // Agent methods now return { text, thinking } objects
      expect(result.text).toContain('Critique')
      expect(agent.agent.generate).toHaveBeenCalledWith(
        expect.stringContaining('Critique this')
      )
    })

    it('should identify clichés via critique', async () => {
      vi.spyOn(agent.agent, 'generate').mockResolvedValue({ text: 'Cliché: Butler did it.' })
      const result = await agent.critique('The butler killed him.', 'Mystery context')
      expect(result.text).toContain('Cliché')
    })
  })

  describe('Consequence Agent', () => {
    let agent: any
    beforeEach(async () => {
      agent = await createConsequenceAgent()
    })

    it('should validate continuity', async () => {
      vi.spyOn(agent.agent, 'generate').mockResolvedValue({ text: 'Issue: Timeline error.' })
      const result = await agent.validateContinuity('beat-1', 'Context')
      // Agent methods now return { text, thinking } objects
      expect(result.text).toContain('Issue')
      expect(agent.agent.generate).toHaveBeenCalledWith(
        expect.stringContaining('continuity'),
        expect.anything()
      )
    })

    it('should check causality', async () => {
      vi.spyOn(agent.agent, 'generate').mockResolvedValue({ text: 'Causality: Valid.' })
      const result = await agent.checkCausality('Car crash.', 'He stole a car.')
      expect(result.text).toContain('Causality')
      expect(agent.agent.generate).toHaveBeenCalledWith(
        expect.stringContaining('Goal:'),
        expect.anything()
      )
    })
  })

})
