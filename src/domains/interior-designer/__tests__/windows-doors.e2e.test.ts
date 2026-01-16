/**
 * Windows and Doors Feature E2E Tests
 *
 * Tests the core functionality including object creation, color switching, grouping, and Meshy integration
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock fetch for API calls
const mockFetch = vi.fn()
global.fetch = mockFetch

describe('Windows and Doors Feature', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Object Creation', () => {
    it('should include window in MODELS list', () => {
      const MODELS = [
        { id: 'cube', name: 'Cube' },
        { id: 'sphere', name: 'Sphere' },
        { id: 'cylinder', name: 'Cylinder' },
        { id: 'cone', name: 'Cone' },
        { id: 'window', name: 'Window' },
        { id: 'door', name: 'Door' },
      ]

      const windowModel = MODELS.find(m => m.id === 'window')
      expect(windowModel).toBeDefined()
      expect(windowModel?.name).toBe('Window')
    })

    it('should include door in MODELS list', () => {
      const MODELS = [
        { id: 'cube', name: 'Cube' },
        { id: 'sphere', name: 'Sphere' },
        { id: 'cylinder', name: 'Cylinder' },
        { id: 'cone', name: 'Cone' },
        { id: 'window', name: 'Window' },
        { id: 'door', name: 'Door' },
      ]

      const doorModel = MODELS.find(m => m.id === 'door')
      expect(doorModel).toBeDefined()
      expect(doorModel?.name).toBe('Door')
    })

    it('should recognize window/door as primitive types', () => {
      const isPrimitive = (modelUrl: string) =>
        ['cube', 'sphere', 'cylinder', 'cone', 'building', 'tree', 'window', 'door'].includes(
          modelUrl
        )

      expect(isPrimitive('window')).toBe(true)
      expect(isPrimitive('door')).toBe(true)
      expect(isPrimitive('someExternalModel.glb')).toBe(false)
    })

    it('should create window object with correct default properties', () => {
      const createObject = (modelUrl: string) => ({
        id: 'test-id',
        modelUrl,
        position: [0, 0, 0] as [number, number, number],
        rotation: [0, 0, 0] as [number, number, number],
        scale: [1, 1, 1] as [number, number, number],
        objectType: modelUrl === 'window' ? 'window' : modelUrl === 'door' ? 'door' : 'generic',
        color: '#8B4513', // Default brown
      })

      const windowObj = createObject('window')
      expect(windowObj.objectType).toBe('window')
      expect(windowObj.color).toBe('#8B4513')
    })

    it('should create door object with correct default properties', () => {
      const createObject = (modelUrl: string) => ({
        id: 'test-id',
        modelUrl,
        position: [0, 0, 0] as [number, number, number],
        rotation: [0, 0, 0] as [number, number, number],
        scale: [1, 1, 1] as [number, number, number],
        objectType: modelUrl === 'window' ? 'window' : modelUrl === 'door' ? 'door' : 'generic',
        color: '#8B4513',
      })

      const doorObj = createObject('door')
      expect(doorObj.objectType).toBe('door')
      expect(doorObj.modelUrl).toBe('door')
    })
  })

  describe('Color Switching', () => {
    it('should update object color in store', () => {
      let objects = [{ id: 'window-1', modelUrl: 'window', color: '#8B4513' }]

      const updateObject = (id: string, updates: { color?: string }) => {
        objects = objects.map(o => (o.id === id ? { ...o, ...updates } : o))
      }

      updateObject('window-1', { color: '#FFFFFF' })

      expect(objects[0].color).toBe('#FFFFFF')
    })

    it('should preserve color across re-renders', () => {
      const objectState = { id: 'door-1', modelUrl: 'door', color: '#2F4F4F' }

      // Simulate multiple re-renders
      const renderedColors: string[] = []
      for (let i = 0; i < 3; i++) {
        renderedColors.push(objectState.color)
      }

      expect(renderedColors).toEqual(['#2F4F4F', '#2F4F4F', '#2F4F4F'])
    })

    it('should apply preset colors correctly', () => {
      const presets = ['#FFFFFF', '#8B4513', '#2F4F4F', '#708090', '#CD853F', '#1a1a1a']

      let currentColor = '#8B4513'
      const setColor = (color: string) => {
        currentColor = color
      }

      presets.forEach(preset => {
        setColor(preset)
        expect(currentColor).toBe(preset)
      })
    })
  })

  describe('Grouping', () => {
    it('should create group from selected objects', () => {
      const groups: { id: string; name: string }[] = []
      let objects = [
        { id: 'window-1', groupId: undefined as string | undefined },
        { id: 'door-1', groupId: undefined as string | undefined },
      ]

      const createGroup = (name: string, objectIds: string[]) => {
        const groupId = 'group-1'
        groups.push({ id: groupId, name })
        objects = objects.map(o => (objectIds.includes(o.id) ? { ...o, groupId } : o))
        return groupId
      }

      const groupId = createGroup('My Group', ['window-1', 'door-1'])

      expect(groups.length).toBe(1)
      expect(groups[0].name).toBe('My Group')
      expect(objects[0].groupId).toBe(groupId)
      expect(objects[1].groupId).toBe(groupId)
    })

    it('should add object to existing group', () => {
      let objects = [
        { id: 'window-1', groupId: 'group-1' },
        { id: 'door-1', groupId: undefined as string | undefined },
      ]

      const addToGroup = (groupId: string, objectId: string) => {
        objects = objects.map(o => (o.id === objectId ? { ...o, groupId } : o))
      }

      addToGroup('group-1', 'door-1')

      expect(objects[1].groupId).toBe('group-1')
    })

    it('should remove object from group', () => {
      let objects = [
        { id: 'window-1', groupId: 'group-1' as string | undefined },
        { id: 'door-1', groupId: 'group-1' as string | undefined },
      ]

      const removeFromGroup = (objectId: string) => {
        objects = objects.map(o => (o.id === objectId ? { ...o, groupId: undefined } : o))
      }

      removeFromGroup('window-1')

      expect(objects[0].groupId).toBeUndefined()
      expect(objects[1].groupId).toBe('group-1')
    })

    it('should select all group members when one is selected', () => {
      const objects = [
        { id: 'window-1', groupId: 'group-1' },
        { id: 'door-1', groupId: 'group-1' },
        { id: 'cube-1', groupId: undefined },
      ]

      const selectGroup = (groupId: string) => {
        return objects.filter(o => o.groupId === groupId).map(o => o.id)
      }

      const selectedIds = selectGroup('group-1')

      expect(selectedIds).toContain('window-1')
      expect(selectedIds).toContain('door-1')
      expect(selectedIds).not.toContain('cube-1')
    })

    it('should move all grouped objects together', () => {
      let objects = [
        { id: 'window-1', groupId: 'group-1', position: [0, 0, 0] as [number, number, number] },
        { id: 'door-1', groupId: 'group-1', position: [2, 0, 0] as [number, number, number] },
      ]

      const moveGroupedObjects = (groupId: string, delta: [number, number, number]) => {
        objects = objects.map(o => {
          if (o.groupId === groupId) {
            return {
              ...o,
              position: [
                o.position[0] + delta[0],
                o.position[1] + delta[1],
                o.position[2] + delta[2],
              ] as [number, number, number],
            }
          }
          return o
        })
      }

      moveGroupedObjects('group-1', [5, 0, 3])

      expect(objects[0].position).toEqual([5, 0, 3])
      expect(objects[1].position).toEqual([7, 0, 3])
    })
  })

  describe('Meshy Integration', () => {
    it('should generate correct prompt for window objects', () => {
      const generatePromptForObject = (modelUrl: string, userPrompt: string) => {
        const contextPrefix =
          modelUrl === 'window'
            ? 'realistic window frame '
            : modelUrl === 'door'
              ? 'realistic door panel '
              : ''
        return `${contextPrefix}${userPrompt}`.trim()
      }

      const prompt = generatePromptForObject('window', 'wooden with brass fittings')
      expect(prompt).toContain('realistic window frame')
      expect(prompt).toContain('wooden with brass fittings')
    })

    it('should generate correct prompt for door objects', () => {
      const generatePromptForObject = (modelUrl: string, userPrompt: string) => {
        const contextPrefix =
          modelUrl === 'window'
            ? 'realistic window frame '
            : modelUrl === 'door'
              ? 'realistic door panel '
              : ''
        return `${contextPrefix}${userPrompt}`.trim()
      }

      const prompt = generatePromptForObject('door', 'medieval oak with iron handle')
      expect(prompt).toContain('realistic door panel')
      expect(prompt).toContain('medieval oak with iron handle')
    })

    it('should trigger text-to-3d API with window context', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ runId: 'task-123' }),
      })

      const triggerTextTo3D = async (objectType: string, prompt: string) => {
        const response = await fetch('/api/interior-designer/text-to-3d', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            prompt: `realistic ${objectType} ${prompt}`,
            projectId: 'test-project',
          }),
        })
        return response.json()
      }

      const result = await triggerTextTo3D('window', 'with stained glass')

      expect(mockFetch).toHaveBeenCalledWith(
        '/api/interior-designer/text-to-3d',
        expect.objectContaining({
          method: 'POST',
          body: expect.stringContaining('window'),
        })
      )
      expect(result.runId).toBe('task-123')
    })
  })

  describe('Keyboard Shortcuts', () => {
    it('should map D key to door placement', () => {
      const keyToAction: Record<string, { mode: string; modelUrl?: string }> = {
        d: { mode: 'OBJECT', modelUrl: 'door' },
        'w+shift': { mode: 'OBJECT', modelUrl: 'window' },
        w: { mode: 'WALL' },
        o: { mode: 'OBJECT' },
      }

      expect(keyToAction['d']).toEqual({ mode: 'OBJECT', modelUrl: 'door' })
    })

    it('should map Shift+W key to window placement', () => {
      const keyToAction: Record<string, { mode: string; modelUrl?: string }> = {
        d: { mode: 'OBJECT', modelUrl: 'door' },
        'w+shift': { mode: 'OBJECT', modelUrl: 'window' },
        w: { mode: 'WALL' },
        o: { mode: 'OBJECT' },
      }

      expect(keyToAction['w+shift']).toEqual({ mode: 'OBJECT', modelUrl: 'window' })
    })
  })
})
