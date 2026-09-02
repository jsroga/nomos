import { beforeEach, describe, expect, it } from 'vitest'
import { useWorldStore, useWorldDataStore } from '../useWorldStore'
import { useWorldUiStore } from '../useWorldUiStore'
import type { Tile, Asset } from '../../core/world-types'

describe('useWorldStore and useWorldDataStore', () => {
  const sampleTile: Tile = {
    id: 'tile-0-0',
    project_id: 'proj-1',
    x: 0,
    y: 0,
    tile_prompt: 'Lush grass',
    image_filename: '0_0.png',
    created_at: '2026-08-01T00:00:00Z',
  }

  const sampleAsset: Asset = {
    id: 'asset-1',
    project_id: 'proj-1',
    image_filename: 'tree.png',
    model_filename: null,
    created_at: '2026-08-01T00:00:00Z',
    metadata: {},
  }

  beforeEach(() => {
    useWorldDataStore.setState({
      tiles: {},
      assets: [],
    })
    useWorldUiStore.setState({
      pendingUpscales: {},
      pendingGenerations: {},
      pendingFidelity: {},
      selectedTile: null,
    })
  })

  describe('useWorldDataStore tile operations', () => {
    it('sets and gets tiles map directly', () => {
      useWorldDataStore.setState({ tiles: { '0,0': sampleTile } })
      expect(useWorldDataStore.getState().tiles['0,0']).toEqual(sampleTile)
      expect(useWorldDataStore.getState().getTile(0, 0)).toEqual(sampleTile)
    })

    it('clears all tiles', () => {
      useWorldDataStore.setState({ tiles: { '0,0': sampleTile } })
      useWorldDataStore.getState().clearTiles()
      expect(useWorldDataStore.getState().tiles).toEqual({})
    })
  })

  describe('useWorldDataStore asset operations', () => {
    it('sets assets list', () => {
      useWorldDataStore.getState().setAssets([sampleAsset])
      expect(useWorldDataStore.getState().assets).toEqual([sampleAsset])
    })

    it('adds and removes assets', () => {
      useWorldDataStore.getState().addAsset(sampleAsset)
      expect(useWorldDataStore.getState().assets).toContainEqual(sampleAsset)

      useWorldDataStore.getState().removeAsset('asset-1')
      expect(useWorldDataStore.getState().assets).toEqual([])
    })

    it('updates an asset by id', () => {
      useWorldDataStore.getState().addAsset(sampleAsset)

      useWorldDataStore.getState().updateAsset('asset-1', {
        image_filename: 'oak_tree.png',
      })

      const updated = useWorldDataStore.getState().assets[0]
      expect(updated.image_filename).toBe('oak_tree.png')
    })
  })

  describe('useWorldStore combined facade', () => {
    it('provides synchronous access to both data and UI slice states', () => {
      const state = useWorldStore.getState()

      expect(state.tiles).toBeDefined()
      expect(state.assets).toBeDefined()
      expect(state.viewport).toBeDefined()
      expect(state.setViewport).toBeTypeOf('function')
      expect(state.acceptGeneration).toBeTypeOf('function')
    })
  })
})
