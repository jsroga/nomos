import { describe, expect, it } from 'vitest'
import {
  toLegacyTile,
  toLegacyProject,
  toLegacyAsset,
  tilesToMap,
} from '../world-types'
import type { WorldTile, WorldProject, WorldAsset } from '../io/world.dto'

describe('world-types mapping utilities', () => {
  describe('toLegacyTile', () => {
    it('converts WorldTile camelCase fields to snake_case legacy Tile', () => {
      const dto: WorldTile = {
        id: 'tile-123',
        projectId: 'proj-456',
        x: 2,
        y: -3,
        tilePrompt: 'Lush green valley with a stream',
        imageFilename: 'tile_2_-3.png',
        createdAt: '2026-08-01T00:00:00Z',
      }

      const legacy = toLegacyTile(dto)

      expect(legacy).toEqual({
        id: 'tile-123',
        project_id: 'proj-456',
        x: 2,
        y: -3,
        tile_prompt: 'Lush green valley with a stream',
        image_filename: 'tile_2_-3.png',
        created_at: '2026-08-01T00:00:00Z',
      })
    })

    it('handles nullable tilePrompt and imageFilename gracefully', () => {
      const dto: WorldTile = {
        id: 'tile-empty',
        projectId: 'proj-456',
        x: 0,
        y: 0,
        tilePrompt: null,
        imageFilename: null,
        createdAt: undefined,
      }

      const legacy = toLegacyTile(dto)

      expect(legacy.tile_prompt).toBeNull()
      expect(legacy.image_filename).toBeNull()
      expect(legacy.created_at).toBeDefined()
    })

    it('preserves undefined vs null handling', () => {
      const dto: WorldTile = {
        id: 'tile-789',
        projectId: 'proj-100',
        x: 1,
        y: 1,
        tilePrompt: 'Castle entrance',
        imageFilename: 'castle.png',
        createdAt: '2026-08-20T12:00:00.000Z',
      }

      const legacy = toLegacyTile(dto)
      expect(legacy.created_at).toBe('2026-08-20T12:00:00.000Z')
    })
  })

  describe('toLegacyProject', () => {
    it('converts WorldProject to legacy Project structure', () => {
      const dto: WorldProject = {
        id: 'proj-1',
        userId: 'user-99',
        name: 'The Whispering Woods',
        description: 'A fantasy map setting',
        masterPrompt: 'High fantasy, oil painting style',
        seriesBible: { lore: 'Ancient kingdom' },
        storyPlan: { act1: 'The discovery' },
        stylePreset: 'fantasy-v2',
        generationMode: 'midjourney-turbo',
        canvasMasterPrompt: 'Isometric hand-painted',
        styleAnchorUrl: 'https://example.com/style.png',
        createdAt: '2026-08-15T08:30:00Z',
      }

      const legacy = toLegacyProject(dto)

      expect(legacy.id).toBe('proj-1')
      expect(legacy.user_id).toBe('user-99')
      expect(legacy.name).toBe('The Whispering Woods')
      expect(legacy.description).toBe('A fantasy map setting')
      expect(legacy.master_prompt).toBe('High fantasy, oil painting style')
      expect(legacy.stylePreset).toBe('fantasy-v2')
      expect(legacy.generationMode).toBe('midjourney-turbo')
      expect(legacy.canvasMasterPrompt).toBe('Isometric hand-painted')
      expect(legacy.styleAnchorUrl).toBe('https://example.com/style.png')
      expect(legacy.created_at).toBe('2026-08-15T08:30:00Z')
    })

    it('falls back to default empty values when optional fields are null or omitted', () => {
      const dto: WorldProject = {
        id: 'proj-min',
        userId: undefined,
        name: 'Minimal Project',
        masterPrompt: 'Minimal',
        description: null,
        seriesBible: {},
        storyPlan: {},
        stylePreset: null,
        generationMode: null,
        canvasMasterPrompt: '',
        styleAnchorUrl: null,
        createdAt: undefined,
      }

      const legacy = toLegacyProject(dto)

      expect(legacy.description).toBeNull()
      expect(legacy.stylePreset).toBeNull()
      expect(legacy.generationMode).toBeNull()
      expect(legacy.styleAnchorUrl).toBeNull()
      expect(legacy.created_at).toBeUndefined()
    })
  })

  describe('toLegacyAsset', () => {
    it('converts WorldAsset to legacy Asset with full bounding box and bounds metadata', () => {
      const dto: WorldAsset = {
        id: 'asset-1',
        projectId: 'proj-1',
        userId: 'user-1',
        imageFilename: 'chest.png',
        modelFilename: 'chest.glb',
        metadata: {
          bounds: { x: 100, y: 150, width: 64, height: 64 },
          box: { x1: 100, y1: 150, x2: 164, y2: 214 },
        },
        createdAt: '2026-08-10T10:00:00Z',
      }

      const legacy = toLegacyAsset(dto)

      expect(legacy.id).toBe('asset-1')
      expect(legacy.project_id).toBe('proj-1')
      expect(legacy.image_filename).toBe('chest.png')
      expect(legacy.model_filename).toBe('chest.glb')
      expect(legacy.metadata.bounds).toEqual({ x: 100, y: 150, width: 64, height: 64 })
      expect(legacy.metadata.box).toEqual({ x1: 100, y1: 150, x2: 164, y2: 214 })
      expect(legacy.created_at).toBe('2026-08-10T10:00:00Z')
    })

    it('handles empty metadata without error', () => {
      const dto: WorldAsset = {
        id: 'asset-empty',
        projectId: 'proj-1',
        userId: undefined,
        imageFilename: 'empty.png',
        modelFilename: null,
        metadata: {},
        createdAt: undefined,
      }

      const legacy = toLegacyAsset(dto)

      expect(legacy.id).toBe('asset-empty')
      expect(legacy.metadata.bounds).toBeUndefined()
      expect(legacy.metadata.box).toBeUndefined()
      expect(legacy.created_at).toBeDefined()
    })
  })

  describe('tilesToMap', () => {
    it('converts an array of tiles into a coordinate keyed map', () => {
      const tileA: WorldTile = {
        id: 't-0-0',
        projectId: 'proj-1',
        x: 0,
        y: 0,
        tilePrompt: 'Grass',
        imageFilename: '0_0.png',
        createdAt: '2026-08-01T00:00:00Z',
      }
      const tileB: WorldTile = {
        id: 't-1-0',
        projectId: 'proj-1',
        x: 1,
        y: 0,
        tilePrompt: 'Dirt path',
        imageFilename: '1_0.png',
        createdAt: '2026-08-01T00:00:00Z',
      }

      const map = tilesToMap([tileA, tileB])

      expect(Object.keys(map)).toHaveLength(2)
      expect(map['0,0'].id).toBe('t-0-0')
      expect(map['1,0'].id).toBe('t-1-0')
    })

    it('returns an empty map for empty array', () => {
      expect(tilesToMap([])).toEqual({})
    })
  })
})
