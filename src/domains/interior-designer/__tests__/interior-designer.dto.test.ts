import { describe, expect, it } from 'vitest'
import {
  createInteriorDesignRequestSchema,
  interiorDesignSchema,
  interiorMaterialRequestSchema,
  interiorMaterialStatusResponseSchema,
  interiorRetextureRequestSchema,
  interiorRetextureStatusResponseSchema,
  interiorTextTo3DRequestSchema,
  interiorTextTo3DStatusResponseSchema,
  interiorTextureRequestSchema,
  interiorTextureResponseSchema,
} from '../io/interior-designer.dto'

describe('interior-designer dto schemas', () => {
  it('parses a persisted interior design payload and normalizes date fields', () => {
    const parsed = interiorDesignSchema.parse({
      id: 'design-1',
      projectId: 'project-1',
      userId: 'user-1',
      name: 'My Scene',
      sceneData: {
        walls: [
          {
            id: 'wall-1',
            start: [0, 0, 0],
            end: [1, 0, 0],
            height: 3,
            thickness: 0.2,
          },
        ],
        floors: [
          {
            id: 'floor-1',
            points: [
              [0, 0, 0],
              [1, 0, 0],
              [1, 0, 1],
            ],
            y: 0,
          },
        ],
        water: [],
        surfaces: [
          {
            id: 'surface-1',
            type: 'road',
            points: [
              [0, 0, 0],
              [1, 0, 0],
            ],
            isPath: true,
            curved: false,
            layerIndex: 0,
          },
        ],
        objects: [
          {
            id: 'object-1',
            modelUrl: '/model.glb',
            position: [0, 0, 0],
            rotation: [0, 0, 0],
            scale: [1, 1, 1],
          },
        ],
        activeLevel: 0,
        terrainSettings: {
          gridResolution: 'medium',
          heightmapSize: 64,
          heightmap: [0, 1, 2],
          materialMap: [0, 1, 0],
          heightmapVersion: 3,
        },
      },
      createdAt: new Date('2026-01-01T00:00:00.000Z'),
      updatedAt: new Date('2026-01-02T00:00:00.000Z'),
    })

    expect(parsed.createdAt).toBe('2026-01-01T00:00:00.000Z')
    expect(parsed.updatedAt).toBe('2026-01-02T00:00:00.000Z')
    expect(parsed.sceneData.terrainSettings?.heightmap).toEqual([0, 1, 2])
  })

  it('accepts the current design save request shape', () => {
    const parsed = createInteriorDesignRequestSchema.parse({
      projectId: 'project-1',
      name: 'Untitled Design',
      sceneData: {
        walls: [],
        floors: [],
        water: [],
        surfaces: [],
        objects: [],
        activeLevel: 0,
        terrainSettings: {
          baseGroundHeight: 0,
          waterSurfaceHeight: -3,
          showWaterPlane: true,
          gridResolution: 'medium',
          heightmapSize: 64,
          heightmap: null,
          heightmapVersion: 0,
          materialMap: null,
        },
      },
    })

    expect(parsed.sceneData.activeLevel).toBe(0)
    expect(parsed.sceneData.terrainSettings?.gridResolution).toBe('medium')
  })

  it('parses texture and generation request payloads used by the current UI', () => {
    expect(
      interiorTextureRequestSchema.parse({
        prompt: 'mossy stone',
        apiKey: 'sk-test',
        style: 'painterly',
        useSemanticSearch: true,
        width: 1024,
        height: 1024,
      })
    ).toMatchObject({ style: 'painterly' })

    expect(
      interiorRetextureRequestSchema.parse({
        modelUrlOrBase64: 'https://example.com/model.glb',
        prompt: 'weathered bronze',
        assetId: 'asset-1',
        projectId: 'project-1',
        apiKey: 'meshy-key',
      })
    ).toMatchObject({ assetId: 'asset-1' })

    expect(
      interiorTextTo3DRequestSchema.parse({
        projectId: 'project-1',
        prompt: 'ornate sci-fi chair',
        seed: 123,
        apiKey: 'meshy-key',
        enablePbr: true,
        targetPolycount: 30000,
        topology: 'triangle',
      })
    ).toMatchObject({ seed: 123 })

    expect(
      interiorMaterialRequestSchema.parse({
        projectId: 'project-1',
        surfaceId: 'surface-1',
        prompt: 'wet asphalt',
        apiKey: 'meshy-key',
        artStyle: 'realistic',
        surfaceBounds: {
          width: 2,
          depth: 4,
          centerX: 10,
          centerZ: 12,
        },
      })
    ).toMatchObject({ surfaceId: 'surface-1' })
  })

  it('parses generation status payloads and texture responses', () => {
    expect(
      interiorTextureResponseSchema.parse({
        imageUrl: 'https://cdn.example.com/texture.png',
      })
    ).toEqual({
      imageUrl: 'https://cdn.example.com/texture.png',
    })

    expect(
      interiorRetextureStatusResponseSchema.parse({
        status: 'COMPLETED',
        output: {
          success: true,
          retexturedUrl: 'https://cdn.example.com/retextured.glb',
        },
      })
    ).toMatchObject({
      status: 'COMPLETED',
      output: { retexturedUrl: 'https://cdn.example.com/retextured.glb' },
    })

    expect(
      interiorTextTo3DStatusResponseSchema.parse({
        status: 'RUNNING',
        output: null,
        error: null,
        metadata: { progress: 55, stage: 'meshing' },
      })
    ).toMatchObject({
      metadata: { progress: 55, stage: 'meshing' },
    })

    expect(
      interiorMaterialStatusResponseSchema.parse({
        status: 'SUCCESS',
        output: {
          success: true,
          modelUrl: 'https://cdn.example.com/material.glb',
          thumbnailUrl: 'https://cdn.example.com/material.png',
        },
        metadata: { progress: 100, stage: 'completed' },
      })
    ).toMatchObject({
      output: { modelUrl: 'https://cdn.example.com/material.glb' },
    })
  })
})
