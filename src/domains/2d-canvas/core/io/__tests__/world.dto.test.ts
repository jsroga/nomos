import { describe, expect, it } from 'vitest'
import {
  createProjectRequestSchema,
  deleteProjectQuerySchema,
  deleteTileRequestSchema,
  listAssetsQuerySchema,
  listTilesQuerySchema,
  projectListResponseSchema,
  selectBoxSchema,
  tileListResponseSchema,
  upsertTileRequestSchema,
  worldAssetSchema,
  worldProjectSchema,
  worldTileSchema,
} from '../world.dto'

describe('world.dto zod schemas', () => {
  describe('worldProjectSchema', () => {
    const validUuid = '123e4567-e89b-12d3-a456-426614174000'
    const userUuid = '987fcdeb-51a2-43f7-9876-543210987654'

    it('parses camelCase project payload', () => {
      const parsed = worldProjectSchema.parse({
        id: validUuid,
        userId: userUuid,
        name: 'Alpha Project',
        masterPrompt: 'Cyberpunk city',
        description: 'Night market map',
        seriesBible: { lore: 'high tech' },
        storyPlan: { quest: 'find chip' },
        stylePreset: 'isometric-cyber',
        generationMode: 'midjourney-turbo',
        canvasMasterPrompt: 'Neon reflections',
        styleAnchorUrl: 'https://cdn.example.com/style.png',
        createdAt: '2026-08-01T12:00:00.000Z',
      })

      expect(parsed).toEqual({
        id: validUuid,
        userId: userUuid,
        name: 'Alpha Project',
        masterPrompt: 'Cyberpunk city',
        description: 'Night market map',
        seriesBible: { lore: 'high tech' },
        storyPlan: { quest: 'find chip' },
        stylePreset: 'isometric-cyber',
        generationMode: 'midjourney-turbo',
        canvasMasterPrompt: 'Neon reflections',
        styleAnchorUrl: 'https://cdn.example.com/style.png',
        createdAt: '2026-08-01T12:00:00.000Z',
      })
    })

    it('parses snake_case project payload and maps to camelCase', () => {
      const parsed = worldProjectSchema.parse({
        id: validUuid,
        user_id: userUuid,
        name: 'Beta Project',
        master_prompt: 'Medieval dungeon',
        series_bible: { faction: 'knights' },
        story_plan: { boss: 'dragon' },
        style_preset: 'dark-fantasy',
        generation_mode: 'gemini',
        canvas_master_prompt: 'Torches and stone walls',
        style_anchor_url: 'https://cdn.example.com/medieval.png',
        created_at: new Date('2026-08-02T15:00:00.000Z'),
      })

      expect(parsed.id).toBe(validUuid)
      expect(parsed.userId).toBe(userUuid)
      expect(parsed.masterPrompt).toBe('Medieval dungeon')
      expect(parsed.seriesBible).toEqual({ faction: 'knights' })
      expect(parsed.storyPlan).toEqual({ boss: 'dragon' })
      expect(parsed.stylePreset).toBe('dark-fantasy')
      expect(parsed.generationMode).toBe('gemini')
      expect(parsed.canvasMasterPrompt).toBe('Torches and stone walls')
      expect(parsed.styleAnchorUrl).toBe('https://cdn.example.com/medieval.png')
      expect(parsed.createdAt).toBe('2026-08-02T15:00:00.000Z')
    })

    it('applies defaults when optional fields are omitted or null', () => {
      const parsed = worldProjectSchema.parse({
        id: validUuid,
        name: 'Minimal Project',
      })

      expect(parsed.id).toBe(validUuid)
      expect(parsed.name).toBe('Minimal Project')
      expect(parsed.userId).toBeUndefined()
      expect(parsed.masterPrompt).toBe('')
      expect(parsed.description).toBeNull()
      expect(parsed.seriesBible).toEqual({})
      expect(parsed.storyPlan).toEqual({})
      expect(parsed.stylePreset).toBeNull()
      expect(parsed.generationMode).toBeNull()
      expect(parsed.canvasMasterPrompt).toBe('')
      expect(parsed.styleAnchorUrl).toBeNull()
    })

    it('fails when id is not a valid UUID', () => {
      expect(() =>
        worldProjectSchema.parse({
          id: 'not-a-uuid',
          name: 'Bad ID',
        })
      ).toThrow()
    })

    it('fails when name is missing', () => {
      expect(() =>
        worldProjectSchema.parse({
          id: validUuid,
        })
      ).toThrow()
    })
  })

  describe('worldTileSchema', () => {
    const tileId = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'
    const projectId = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb'

    it('parses camelCase tile payload', () => {
      const parsed = worldTileSchema.parse({
        id: tileId,
        projectId,
        x: 10,
        y: -5,
        tilePrompt: 'Desert oasis with palm trees',
        imageFilename: '10_-5.png',
        createdAt: '2026-08-03T09:00:00.000Z',
      })

      expect(parsed).toEqual({
        id: tileId,
        projectId,
        x: 10,
        y: -5,
        tilePrompt: 'Desert oasis with palm trees',
        imageFilename: '10_-5.png',
        createdAt: '2026-08-03T09:00:00.000Z',
      })
    })

    it('parses snake_case tile payload', () => {
      const parsed = worldTileSchema.parse({
        id: tileId,
        project_id: projectId,
        x: 0,
        y: 0,
        tile_prompt: 'Starting zone',
        image_filename: '0_0.png',
        created_at: new Date('2026-08-04T10:00:00.000Z'),
      })

      expect(parsed.projectId).toBe(projectId)
      expect(parsed.tilePrompt).toBe('Starting zone')
      expect(parsed.imageFilename).toBe('0_0.png')
      expect(parsed.createdAt).toBe('2026-08-04T10:00:00.000Z')
    })

    it('throws when projectId/project_id is missing', () => {
      expect(() =>
        worldTileSchema.parse({
          id: tileId,
          x: 0,
          y: 0,
        })
      ).toThrow()
    })

    it('fails when coordinates are non-integers', () => {
      expect(() =>
        worldTileSchema.parse({
          id: tileId,
          projectId,
          x: 1.5,
          y: 0,
        })
      ).toThrow()
    })

    it('sets null for missing tilePrompt and imageFilename', () => {
      const parsed = worldTileSchema.parse({
        id: tileId,
        projectId,
        x: 2,
        y: 3,
      })
      expect(parsed.tilePrompt).toBeNull()
      expect(parsed.imageFilename).toBeNull()
    })
  })

  describe('worldAssetSchema', () => {
    const assetId = 'cccccccc-cccc-4ccc-8ccc-cccccccccccc'
    const projectId = 'dddddddd-dddd-4ddd-8ddd-dddddddddddd'

    it('parses valid asset with camelCase fields', () => {
      const parsed = worldAssetSchema.parse({
        id: assetId,
        projectId,
        imageFilename: 'chest.png',
        modelFilename: 'chest.glb',
        metadata: { tag: 'interactive' },
        createdAt: '2026-08-05T14:00:00.000Z',
      })

      expect(parsed).toEqual({
        id: assetId,
        projectId,
        userId: undefined,
        imageFilename: 'chest.png',
        modelFilename: 'chest.glb',
        metadata: { tag: 'interactive' },
        createdAt: '2026-08-05T14:00:00.000Z',
      })
    })

    it('parses valid asset with snake_case fields', () => {
      const parsed = worldAssetSchema.parse({
        id: assetId,
        project_id: projectId,
        image_filename: 'barrel.png',
        model_filename: null,
      })

      expect(parsed.projectId).toBe(projectId)
      expect(parsed.imageFilename).toBe('barrel.png')
      expect(parsed.modelFilename).toBeNull()
      expect(parsed.metadata).toEqual({})
    })

    it('throws when imageFilename is missing', () => {
      expect(() =>
        worldAssetSchema.parse({
          id: assetId,
          projectId,
        })
      ).toThrow()
    })

    it('throws when projectId is missing', () => {
      expect(() =>
        worldAssetSchema.parse({
          id: assetId,
          imageFilename: 'item.png',
        })
      ).toThrow()
    })
  })

  describe('request and query schemas', () => {
    const validUuid = '123e4567-e89b-12d3-a456-426614174000'

    it('createProjectRequestSchema requires non-empty name and defaults masterPrompt', () => {
      const parsed = createProjectRequestSchema.parse({ name: 'My Map' })
      expect(parsed.name).toBe('My Map')
      expect(parsed.masterPrompt).toBe('')

      expect(() => createProjectRequestSchema.parse({ name: '' })).toThrow()
    })

    it('deleteProjectQuerySchema validates projectId UUID', () => {
      const parsed = deleteProjectQuerySchema.parse({ projectId: validUuid })
      expect(parsed.projectId).toBe(validUuid)
      expect(() => deleteProjectQuerySchema.parse({ projectId: 'invalid' })).toThrow()
    })

    it('listTilesQuerySchema validates projectId UUID', () => {
      const parsed = listTilesQuerySchema.parse({ projectId: validUuid })
      expect(parsed.projectId).toBe(validUuid)
    })

    it('upsertTileRequestSchema validates integer coordinates and imageFilename', () => {
      const parsed = upsertTileRequestSchema.parse({
        projectId: validUuid,
        x: 3,
        y: -4,
        imageFilename: 'tile_3_-4.png',
      })
      expect(parsed.x).toBe(3)
      expect(parsed.y).toBe(-4)
      expect(parsed.tilePrompt).toBe('')
      expect(parsed.imageFilename).toBe('tile_3_-4.png')

      expect(() =>
        upsertTileRequestSchema.parse({
          projectId: validUuid,
          x: 3,
          y: -4,
          imageFilename: '',
        })
      ).toThrow()
    })

    it('deleteTileRequestSchema validates projectId and integer coordinates', () => {
      const parsed = deleteTileRequestSchema.parse({
        projectId: validUuid,
        x: 0,
        y: 0,
      })
      expect(parsed.x).toBe(0)
      expect(parsed.y).toBe(0)
      expect(() => deleteTileRequestSchema.parse({ projectId: validUuid, x: 0.2, y: 0 })).toThrow()
    })

    it('listAssetsQuerySchema validates projectId UUID', () => {
      const parsed = listAssetsQuerySchema.parse({ projectId: validUuid })
      expect(parsed.projectId).toBe(validUuid)
    })

    it('selectBoxSchema parses numerical bounds', () => {
      const parsed = selectBoxSchema.parse({
        x1: 10.5,
        y1: 20.5,
        x2: 100.2,
        y2: 200.8,
      })
      expect(parsed).toEqual({
        x1: 10.5,
        y1: 20.5,
        x2: 100.2,
        y2: 200.8,
      })
    })

    it('projectListResponseSchema parses array of projects', () => {
      const parsed = projectListResponseSchema.parse([
        { id: validUuid, name: 'Project 1' },
      ])
      expect(parsed).toHaveLength(1)
      expect(parsed[0].name).toBe('Project 1')
    })

    it('tileListResponseSchema parses array of tiles', () => {
      const parsed = tileListResponseSchema.parse([
        { id: validUuid, projectId: validUuid, x: 0, y: 0 },
      ])
      expect(parsed).toHaveLength(1)
      expect(parsed[0].x).toBe(0)
    })
  })
})
