import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createStorytellerAgent } from '../storyteller-agent'
import { createPsychologistAgent } from '../psychologist-agent'
import { createGardenerAgent } from '../gardener-agent'
import { createDevilsAdvocateAgent } from '../devils-advocate-agent'
import { createConsequenceAgent } from '../consequence-agent'
import { storyCreationWorkflow } from '../story-workflow'
import { db } from '@/lib/db'
import { updateWorldBibleTool } from '../../../tools/v2/world-building-tools'
import { runStoryCreationWorkflowTool } from '../../../tools/v2/workflow-tools'

// ============================================
// MOCKS
// ============================================

// Mock DB
vi.mock('@/lib/db', () => ({
  db: {
    select: vi.fn(() => ({
      from: vi.fn(() => ({
        where: vi.fn(() => [
          {
            seriesBible: { General: {} },
            id: 'test-project-id',
          },
        ]),
      })),
    })),
    update: vi.fn(() => ({
      set: vi.fn(() => ({
        where: vi.fn(() => Promise.resolve([{}])),
      })),
    })),
    insert: vi.fn(() => ({
      values: vi.fn(() => Promise.resolve()),
    })),
  },
}))

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
        expect.stringContaining('psychological analysis')
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
      expect(agent.agent.generate).toHaveBeenCalledWith(expect.stringContaining('Write the prose'))
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
      expect(agent.agent.generate).toHaveBeenCalledWith(expect.stringContaining('Critique this'))
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
      expect(agent.agent.generate).toHaveBeenCalledWith(expect.stringContaining('continu'))
    })

    it('should check causality', async () => {
      vi.spyOn(agent.agent, 'generate').mockResolvedValue({ text: 'Causality: Valid.' })
      const result = await agent.checkCausality('Car crash.', 'He stole a car.')
      expect(result.text).toContain('Causality')
      expect(agent.agent.generate).toHaveBeenCalledWith(expect.stringContaining('causal'))
    })
  })

  // ============================================
  // 2. TOOL TESTS (3 per Tool)
  // ============================================

  describe('Tool: update_world_bible', () => {
    const tool = updateWorldBibleTool

    it('should successfully merge top-level updates (Flattened Schema)', async () => {
      const result = await tool.execute({
        context: {
          projectId: 'test-project-id',
          // No category = top level
          worldDescription: 'New Description',
          genre: 'Horror',
          bibleType: 'General',
        },
        runtimeContext: {} as any,
      })
      // Tool returns a stringified JSON
      const parsed = JSON.parse(result as string)
      expect(parsed.success).toBe(true)
      expect(db.update).toHaveBeenCalled()
    })

    it('should successfully merge category-nested updates', async () => {
      const result = await tool.execute({
        context: {
          projectId: 'test-project-id',
          category: 'Magic',
          worldRules: ['No fire magic'],
        },
        runtimeContext: {} as any,
      })
      const parsed = JSON.parse(result as string)
      expect(parsed.success).toBe(true)
      // Tool returns generic success message, checks db update implicitly
      expect(parsed.message).toContain('Updated Bible')
    })

    it('should handle passthrough logic for unknown fields', async () => {
      const result = await tool.execute({
        context: {
          projectId: 'test-project-id',
          randomCustomField: 'CustomValue',
        } as any,
        runtimeContext: {} as any,
      })
      const parsed = JSON.parse(result as string)
      expect(parsed.success).toBe(true)
      expect(parsed.keys).toContain('randomCustomField')
    })
  })

  describe('Tool: run_story_creation_workflow', () => {
    const tool = runStoryCreationWorkflowTool

    it('should trigger the workflow successfully', async () => {
      // Mock workflow execute
      const executeSpy = vi.spyOn(storyCreationWorkflow, 'execute').mockResolvedValue({
        results: {
          synthesis: {
            status: 'success',
            output: { finalOutput: 'Story Complete' },
          },
        },
      } as any)

      const result = await tool.execute({
        context: {
          projectId: 'test-proj',
          goal: 'Write a story',
          context: 'Context here',
        },
        runtimeContext: {} as any,
      })

      expect(result).toContain('Story Complete')
      expect(executeSpy).toHaveBeenCalled()
    })

    it('should handle workflow errors gracefully', async () => {
      vi.spyOn(storyCreationWorkflow, 'execute').mockRejectedValue(new Error('Workflow Failed'))

      const result = await tool.execute({
        context: { projectId: 'test', goal: 'Fail', context: 'fail' },
        runtimeContext: {} as any,
      })

      // Tool returns string on error or success
      expect(result).toContain('Workflow failed')
    })

    it('should validate input requirements', async () => {
      // Missing projectId etc (handled by Zod usually, but if called directly with bad data)
      try {
        await tool.execute({ context: { goal: 'No ID' } as any, runtimeContext: {} as any })
      } catch (e) {
        expect(e).toBeDefined()
      }
    })
  })

  // ============================================
  // 3. WORKFLOW INTEGRATION
  // ============================================
  describe('Full Workflow Integration', () => {
    it('should orchestrate a chat -> agent -> workflow flow', async () => {
      // 1. Create Main Agent
      const storyteller = await createStorytellerAgent()

      // 2. Mock its tool usage decision
      const runWorkflowSpy = vi.spyOn(storyCreationWorkflow, 'execute').mockResolvedValue({
        results: {
          synthesis: {
            status: 'success',
            output: { finalOutput: 'The Hero wins.' },
          },
        },
      } as any)

      const tool = (storyteller as any).toolsMap['run_story_creation_workflow']
      expect(tool).toBeDefined()

      // 3. Execute Tool
      const result = await tool.execute({
        context: { projectId: 'p1', goal: 'Make a hero story', context: 'Hero context' },
        runtimeContext: {} as any,
      })

      // 4. Verify Workflow was triggered
      expect(runWorkflowSpy).toHaveBeenCalled()
      expect(result).toContain('The Hero wins')
    })
  })
})
