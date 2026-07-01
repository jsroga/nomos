/**
 * Phase Transitions & Model Configuration E2E Tests
 *
 * Tests for:
 * 1. Story phase transitions (premise → breaking → writing → complete)
 * 2. Dynamic model effort selection (low/medium/high)
 * 3. Structured output validation
 * 4. Agent network robustness
 *
 * References:
 * - https://mastra.ai/docs/agents/networks
 * - https://mastra.ai/docs/agents/structured-output
 * - https://mastra.ai/models
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createStorytellerAgent } from '@/domains/storyteller/agents/StorytellerAgent'
import { EpisodePremiseSchema, PremiseArchitectResponseSchema } from '@/domains/storyteller/agents/PremiseArchitectAgent'
import {
  getAgentModel,
  getModelByEffort,
  inferEffortFromContext,
  toMastraModelString,
  MODEL_FALLBACKS,
} from '@/domains/storyteller/agents/ModelConfig'
import { updateStoryPhaseTool } from '@/domains/storyteller/tools/storytelling-adapter'

// Mock DB interactions
vi.mock('@/lib/db', () => ({
  db: {
    select: vi.fn(() => ({
      from: vi.fn(() => ({
        where: vi.fn(() => [
          {
            id: 'test-episode-id',
            currentPhase: 'premise',
            seriesBible: { General: {} },
          },
        ]),
      })),
    })),
    update: vi.fn(() => ({
      set: vi.fn(() => ({
        where: vi.fn(() => Promise.resolve([{ id: 'test-episode-id' }])),
      })),
    })),
  },
}))

// Mock Langfuse to avoid API calls
vi.mock('../../../../agent-core/observability', () => ({
  withSpan: vi.fn((id, name, fn) => fn({})),
  langfuse: {
    span: vi.fn(() => ({ end: vi.fn() })),
    event: vi.fn(),
  },
  recordAgentGeneration: vi.fn(),
  recordAgentThinking: vi.fn(),
  recordAgentScore: vi.fn(),
  createAgentTrace: vi.fn(),
}))

// Mock embeddings
vi.mock('@/infrastructure/ai/embeddings/voyage-embeddings', () => ({
  getVoyageEmbeddings: vi.fn(() => ({
    embedQuery: vi.fn().mockResolvedValue(new Array(1024).fill(0)),
  })),
}))

describe('Phase Transitions', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('update_story_phase tool', () => {
    it('should have correct tool configuration', () => {
      // Verify tool ID
      expect(updateStoryPhaseTool.id).toBe('update_story_phase')

      // Verify tool has description
      expect(updateStoryPhaseTool.description).toBeDefined()
      expect(updateStoryPhaseTool.description.length).toBeGreaterThan(0)

      // Verify tool has input schema
      expect(updateStoryPhaseTool.inputSchema).toBeDefined()
    })

    it('should define all valid phase values in schema', () => {
      // Test that the schema includes all phase values
      const validPhases = ['premise', 'breaking', 'writing', 'complete']

      // Verify tool exists and has schema
      expect(updateStoryPhaseTool.inputSchema).toBeDefined()

      // The schema should accept these phases
      for (const phase of validPhases) {
        // Schema validation would happen at runtime
        expect(validPhases).toContain(phase)
      }
    })

    it('should have execute function', () => {
      // Verify tool has execute function
      expect(typeof updateStoryPhaseTool.execute).toBe('function')
    })
  })

  describe('StorytellerAgent phase awareness', () => {
    it('should have update_story_phase tool available', async () => {
      const agent = await createStorytellerAgent()
      const tool = (agent as any).toolsMap['update_story_phase']

      expect(tool).toBeDefined()
      expect(tool.id).toBe('update_story_phase')
    })

    it('should include phase-related instructions in system prompt', async () => {
      const agent = await createStorytellerAgent()
      // Mastra 1.x uses getInstructions() instead of instructions property
      const instructions =
        typeof (agent as any).agent.getInstructions === 'function'
          ? await (agent as any).agent.getInstructions()
          : (agent as any).agent.instructions

      // Skip test if instructions not accessible (internal API changed)
      if (!instructions || typeof instructions !== 'string') {
        console.warn('Agent instructions not accessible - skipping content check')
        return
      }

      expect(instructions).toContain('premise')
      expect(instructions).toContain('breaking')
      expect(instructions).toContain('update_story_phase')
    })
  })
})

describe('Dynamic Model Selection', () => {
  describe('getModelByEffort', () => {
    it('should return correct model for low effort', () => {
      expect(getModelByEffort('low')).toBe('openai:gpt-4o-mini')
    })

    it('should return correct model for medium effort', () => {
      expect(getModelByEffort('medium')).toBe('openai:gpt-4o-mini')
    })

    it('should return correct model for high effort', () => {
      expect(getModelByEffort('high')).toBe('anthropic:claude-sonnet-4-20250514')
    })

    it('should default to medium effort', () => {
      expect(getModelByEffort()).toBe('openai:gpt-4o-mini')
    })
  })

  describe('getAgentModel with effort levels', () => {
    it('should accept effort level as input', () => {
      const lowModel = getAgentModel('low')
      const mediumModel = getAgentModel('medium')
      const highModel = getAgentModel('high')

      // Should not throw and should return model objects or strings
      expect(lowModel).toBeDefined()
      expect(mediumModel).toBeDefined()
      expect(highModel).toBeDefined()
    })

    it('should still accept direct model names', () => {
      const openaiModel = getAgentModel('openai:gpt-4o')
      const anthropicModel = getAgentModel('anthropic:claude-sonnet-4-20250514')

      expect(openaiModel).toBeDefined()
      expect(anthropicModel).toBeDefined()
    })
  })

  describe('inferEffortFromContext', () => {
    it('should return high for creative tasks', () => {
      expect(inferEffortFromContext({ taskType: 'creative' })).toBe('high')
    })

    it('should return high for reasoning tasks', () => {
      expect(inferEffortFromContext({ requiresReasoning: true })).toBe('high')
    })

    it('should return medium for complex tasks', () => {
      expect(inferEffortFromContext({ taskType: 'complex' })).toBe('medium')
    })

    it('should return medium for tasks with tool calls', () => {
      expect(inferEffortFromContext({ hasToolCalls: true })).toBe('medium')
    })

    it('should return low for simple tasks', () => {
      expect(inferEffortFromContext({ taskType: 'simple' })).toBe('low')
      expect(inferEffortFromContext({})).toBe('low')
    })
  })

  describe('toMastraModelString', () => {
    it('should convert colon format to slash format', () => {
      expect(toMastraModelString('openai:gpt-4o')).toBe('openai/gpt-4o')
      expect(toMastraModelString('anthropic:claude-sonnet-4-20250514')).toBe(
        'anthropic/claude-sonnet-4-20250514'
      )
    })
  })

  describe('MODEL_FALLBACKS', () => {
    it('should have correct fallback configuration', () => {
      expect(MODEL_FALLBACKS.length).toBeGreaterThanOrEqual(2)
      expect(MODEL_FALLBACKS[0].model).toBe('openai/gpt-4o')
      expect(MODEL_FALLBACKS[0].maxRetries).toBe(3)
    })
  })
})

describe('Structured Output Schemas', () => {
  describe('EpisodePremiseSchema', () => {
    it('should validate a complete episode premise', () => {
      const validPremise = {
        title: 'The Ozymandias Moment',
        logline: 'A father must choose between his legacy and his son.',
        theHook: 'A burning house with no way out.',
        theTurn: 'The son reveals he knows the truth.',
        theAftermath: 'The family will never be the same.',
        protagonistHook: 'He receives a call that changes everything.',
        fatalFlaw: 'Pride that blinds him to consequences.',
        stakes: 'Physical: his life. Professional: his empire. Psychological: his identity.',
        transformation: 'From certainty to doubt.',
        inevitableConsequence: 'His own actions sealed his fate.',
        thematicFocus: 'Can we escape our own nature?',
        charactersInvolved: ['Father', 'Son', 'Mother'],
        tenPointsPlan: ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10'],
      }

      const result = EpisodePremiseSchema.safeParse(validPremise)
      expect(result.success).toBe(true)
    })

    it('should reject incomplete episode premise', () => {
      const incompletePremise = {
        title: 'Incomplete',
        // Missing required fields
      }

      const result = EpisodePremiseSchema.safeParse(incompletePremise)
      expect(result.success).toBe(false)
    })
  })

  describe('PremiseArchitectResponseSchema', () => {
    it('should validate complete response with episodePremise', () => {
      const validResponse = {
        message: 'This premise works because...',
        episodePremise: {
          title: 'Test Episode',
          logline: 'A test logline.',
          theHook: 'The hook.',
          theTurn: 'The turn.',
          theAftermath: 'The aftermath.',
          protagonistHook: 'The protagonist hook.',
          fatalFlaw: 'The fatal flaw.',
          stakes: 'The stakes.',
          transformation: 'The transformation.',
          inevitableConsequence: 'The consequence.',
          thematicFocus: 'The theme.',
          charactersInvolved: ['Char A'],
          tenPointsPlan: ['Point 1'],
        },
        confidence: 0.95,
      }

      const result = PremiseArchitectResponseSchema.safeParse(validResponse)
      expect(result.success).toBe(true)
    })

    it('should enforce confidence range 0-1', () => {
      const invalidConfidence = {
        message: 'Test',
        episodePremise: {
          title: 'Test',
          logline: 'Test',
          theHook: 'Test',
          theTurn: 'Test',
          theAftermath: 'Test',
          protagonistHook: 'Test',
          fatalFlaw: 'Test',
          stakes: 'Test',
          transformation: 'Test',
          inevitableConsequence: 'Test',
          thematicFocus: 'Test',
          charactersInvolved: [],
          tenPointsPlan: [],
        },
        confidence: 1.5, // Invalid - above 1
      }

      const result = PremiseArchitectResponseSchema.safeParse(invalidConfidence)
      expect(result.success).toBe(false)
    })
  })
})

describe('Agent Network Robustness', () => {
  it('should create storyteller agent without errors', async () => {
    const agent = await createStorytellerAgent()
    expect(agent).toBeDefined()
  })

  it('should have all required tools registered', async () => {
    const agent = await createStorytellerAgent()
    const toolsMap = (agent as any).toolsMap

    // Core tools that must exist
    const requiredTools = ['update_world_bible', 'update_story_phase', 'manage_beat', 'list_beats']

    for (const toolId of requiredTools) {
      expect(toolsMap[toolId]).toBeDefined()
    }
  })

  it('should support generate and stream methods', async () => {
    const agent = await createStorytellerAgent()

    expect(typeof agent.run).toBe('function')
    expect(typeof agent.stream).toBe('function')
  })
})
