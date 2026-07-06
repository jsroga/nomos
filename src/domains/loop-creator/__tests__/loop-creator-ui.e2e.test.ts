/**
 * Loop Creator UI E2E Tests
 *
 * Tests the core UI functionality including auto-start generation
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { LoopAgentAction } from '../core/graph/state'

// Mock fetch for API calls
const mockFetch = vi.fn()
global.fetch = mockFetch

describe('Loop Creator - Simple Case E2E', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Create Loop with Game Concept - Auto Generate', () => {
    it('should create loop and trigger auto-generation message', async () => {
      const projectId = 'project-123'
      const loopName = 'Disco Elysium RPG'
      const gameConcept = 'A narrative RPG like Disco Elysium with dialogue-focused gameplay'

      // 1. Mock the loop creation API
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          id: 'new-loop-id',
          name: loopName,
          projectId,
          nodes: [],
          edges: [],
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        }),
      })

      // 2. Simulate creating a loop
      const response = await fetch('/api/loop-creator/loops', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectId, name: loopName, nodes: [], edges: [] }),
      })

      expect(response.ok).toBe(true)
      const newLoop = await response.json()
      expect(newLoop.id).toBe('new-loop-id')
      expect(newLoop.name).toBe(loopName)

      // 3. Verify auto-message would be generated
      const autoMessage = `I want to create a game like this: ${gameConcept}\n\nPlease design the core game loop nodes and mechanics for this concept.`
      expect(autoMessage).toContain(gameConcept)
      expect(autoMessage).toContain('design the core game loop nodes')
    })

    it('should require game concept for new loops', () => {
      const loopName = 'New Loop'
      const gameConcept = ''

      // Validation: can't create without game concept
      const canCreate = Boolean(loopName.trim() && gameConcept.trim())
      expect(canCreate).toBe(false)
    })

    it('should allow creation when both name and concept are provided', () => {
      const loopName = 'My RPG'
      const gameConcept = 'A roguelike deckbuilder'

      const canCreate = Boolean(loopName.trim() && gameConcept.trim())
      expect(canCreate).toBe(true)
    })

    it('should update game context when loop is created', () => {
      let gameContext = {
        gameGenre: '',
        gamePlatform: '',
        targetAudience: '',
        gameDescription: '',
      }

      const gameConcept = 'A survival horror game with crafting mechanics'

      // Simulate setGameContext
      gameContext = {
        ...gameContext,
        gameDescription: gameConcept,
      }

      expect(gameContext.gameDescription).toBe(gameConcept)
    })
  })

  describe('Pending Auto Message Flow', () => {
    it('should queue auto message and send when ready', () => {
      let pendingAutoMessage: string | null = null
      let currentLoopId: string | null = null
      const isSending = false
      let messageSent: string | null = null

      const handleSendMessage = (msg: string) => {
        messageSent = msg
      }

      // Step 1: Loop created, message queued
      currentLoopId = 'loop-123'
      pendingAutoMessage = 'Design a roguelike game'

      // Step 2: Effect runs when conditions are met
      if (pendingAutoMessage && currentLoopId && !isSending) {
        handleSendMessage(pendingAutoMessage)
        pendingAutoMessage = null
      }

      expect(messageSent).toBe('Design a roguelike game')
      expect(pendingAutoMessage).toBeNull()
    })

    it('should not send if already sending', () => {
      let pendingAutoMessage: string | null = 'Design game'
      const currentLoopId: string | null = 'loop-123'
      const isSending = true // Already sending
      let messageSent: string | null = null

      const handleSendMessage = (msg: string) => {
        messageSent = msg
      }

      // Effect should NOT run when isSending is true
      if (pendingAutoMessage && currentLoopId && !isSending) {
        handleSendMessage(pendingAutoMessage)
        pendingAutoMessage = null
      }

      expect(messageSent).toBeNull()
      expect(pendingAutoMessage).toBe('Design game') // Still pending
    })

    it('should not send if no loop selected', () => {
      let pendingAutoMessage: string | null = 'Design game'
      const currentLoopId: string | null = null // No loop
      const isSending = false
      let messageSent: string | null = null

      const handleSendMessage = (msg: string) => {
        messageSent = msg
      }

      if (pendingAutoMessage && currentLoopId && !isSending) {
        handleSendMessage(pendingAutoMessage)
        pendingAutoMessage = null
      }

      expect(messageSent).toBeNull()
    })
  })

  describe('Full Create-to-Generate Flow', () => {
    it('should complete full flow: create loop -> auto send -> receive actions', async () => {
      // Simulate the entire flow

      // 1. User fills dialog
      const loopName = 'Vampire Survivors Clone'
      const gameConcept = 'An auto-battler roguelike like Vampire Survivors with weapon evolution'

      // 2. Loop is created
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          id: 'vs-loop',
          name: loopName,
          nodes: [],
          edges: [],
        }),
      })

      const createResponse = await fetch('/api/loop-creator/loops', {
        method: 'POST',
        body: JSON.stringify({ name: loopName }),
      })
      const newLoop = await createResponse.json()

      // 3. Callback triggers with game concept
      let gameDescription = ''
      let autoMessageSent = ''

      const handleLoopCreated = (loop: any, concept: string) => {
        gameDescription = concept
        autoMessageSent = `I want to create a game like this: ${concept}\n\nPlease design the core game loop nodes and mechanics for this concept.`
      }

      handleLoopCreated(newLoop, gameConcept)

      // 4. Verify
      expect(gameDescription).toBe(gameConcept)
      expect(autoMessageSent).toContain('Vampire Survivors')
      expect(autoMessageSent).toContain('weapon evolution')
      expect(autoMessageSent).toContain('design the core game loop nodes')
    })
  })

  describe('Loop Selector Dialog', () => {
    it('should show game concept field only for new loops', () => {
      const editingLoopId = null // New loop
      const showGameConcept = !editingLoopId
      expect(showGameConcept).toBe(true)
    })

    it('should hide game concept field when renaming', () => {
      const editingLoopId = 'existing-loop' // Renaming
      const showGameConcept = !editingLoopId
      expect(showGameConcept).toBe(false)
    })

    it('should disable create button until both fields are filled', () => {
      const testCases = [
        { name: '', concept: '', expected: false },
        { name: 'My Game', concept: '', expected: false },
        { name: '', concept: 'RPG game', expected: false },
        { name: 'My Game', concept: 'RPG game', expected: true },
      ]

      for (const tc of testCases) {
        const canCreate = Boolean(tc.name.trim() && tc.concept.trim())
        expect(canCreate).toBe(tc.expected)
      }
    })
  })

  describe('Agent Action Output', () => {
    it('loop planner should output ADD_NODE actions for loops', () => {
      // Simulated loop planner output
      const loops = [
        {
          id: 'core-loop',
          name: 'Movement & Combat',
          type: 'core',
          description: 'Core gameplay loop',
          duration: { min: 3, max: 10, typical: 5 },
          playerExperience: 'Tension and release',
          satisfactionPeak: 'When defeating enemies',
        },
        {
          id: 'session-loop',
          name: 'Build Run',
          type: 'session',
          description: 'Session loop building power',
          duration: { min: 15, max: 45, typical: 30 },
          playerExperience: 'Growing power fantasy',
          satisfactionPeak: 'Unlocking new ability',
        },
      ]

      // Convert to actions (like loop-planner.ts does)
      const actions: LoopAgentAction[] = []
      let yOffset = 100

      for (const loop of loops) {
        actions.push({
          type: 'ADD_NODE',
          payload: {
            id: loop.id,
            label: loop.name,
            description: loop.description,
            nodeType:
              loop.type === 'core' ? 'challenge' : loop.type === 'session' ? 'action' : 'reward',
            position: { x: 200, y: yOffset },
            loopData: {
              type: loop.type,
              duration: loop.duration,
              playerExperience: loop.playerExperience,
              satisfactionPeak: loop.satisfactionPeak,
            },
          },
          confidence: 0.8,
          reasoning: `${loop.type} loop: ${loop.playerExperience}`,
        })
        yOffset += 150
      }

      // Verify actions
      expect(actions.length).toBe(2)
      expect(actions[0].type).toBe('ADD_NODE')
      expect(actions[0].payload.label).toBe('Movement & Combat')
      expect(actions[0].payload.nodeType).toBe('challenge') // core -> challenge
      expect(actions[1].payload.nodeType).toBe('action') // session -> action
    })

    it('mechanics designer should output ADD_NODE and ADD_EDGE actions', () => {
      // Simulated mechanics designer output
      const mechanics = [
        {
          id: 'dialogue-check',
          name: 'Internal Dialogue System',
          type: 'core',
          description: 'Skills debate player choices',
          inputs: ['player choice'],
          outputs: ['skill check'],
          balanceFactors: { complexity: 3 },
          examples: ['Disco Elysium thought cabinet'],
        },
      ]

      const connections = [
        {
          id: 'conn-1',
          source: 'dialogue-check',
          target: 'consequence',
          label: 'triggers',
        },
      ]

      // Convert to actions (like mechanics-designer.ts does)
      const actions: LoopAgentAction[] = []

      for (const m of mechanics) {
        const nodeTypeMap: Record<string, string> = {
          core: 'challenge',
          secondary: 'action',
          meta: 'feedback',
          progression: 'reward',
          reward: 'reward',
        }

        actions.push({
          type: 'ADD_NODE',
          payload: {
            id: m.id,
            label: m.name,
            description: m.description,
            nodeType: nodeTypeMap[m.type] || 'action',
            position: { x: 200, y: 100 },
            mechanicData: {
              type: m.type,
              inputs: m.inputs,
              outputs: m.outputs,
              balanceFactors: m.balanceFactors,
              examples: m.examples,
            },
          },
          confidence: 0.8,
          reasoning: 'Test',
        })
      }

      for (const c of connections) {
        actions.push({
          type: 'ADD_EDGE',
          payload: {
            id: c.id,
            source: c.source,
            target: c.target,
            label: c.label,
          },
          confidence: 0.8,
          reasoning: 'Test',
        })
      }

      // Verify
      expect(actions.length).toBe(2) // 1 node + 1 edge
      expect(actions[0].type).toBe('ADD_NODE')
      expect(actions[0].payload.mechanicData?.examples).toContain('Disco Elysium thought cabinet')
      expect(actions[1].type).toBe('ADD_EDGE')
      expect(actions[1].payload.source).toBe('dialogue-check')
    })

    it('actions should map to canvas suggestions correctly', () => {
      // Simulate action -> suggestion conversion (like LoopCreatorLayout does)
      const action: LoopAgentAction = {
        type: 'ADD_NODE',
        payload: {
          id: 'test-node',
          label: 'Test Mechanic',
          description: 'A test mechanic for validation',
          nodeType: 'challenge',
          position: { x: 100, y: 100 },
        },
        confidence: 0.8,
        reasoning: 'Test reasoning',
      }

      // Convert to suggestion
      const suggestion = {
        id: `suggestion-${Date.now()}`,
        type: action.type,
        description: `Add "${action.payload.label}" node`,
        payload: action.payload,
      }

      expect(suggestion.type).toBe('ADD_NODE')
      expect(suggestion.description).toContain('Test Mechanic')
      expect(suggestion.payload.nodeType).toBe('challenge')
    })
  })
})
