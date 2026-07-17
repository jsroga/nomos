'use client'

import React, { useMemo } from 'react'
import { useInteriorStore } from '@/domains/interior-designer'
import { INTERACTION_MODE_TERRAIN } from '@/domains/interior-designer/constants/interaction-modes'
import { LayerPanelTerrainView } from './LayerPanelTerrainView'
import { LayerPanelSceneView } from './LayerPanelSceneView'
import { partitionLayerSurfaces } from './utils/partition-layer-surfaces'

export const LayerPanel: React.FC = () => {
  const mode = useInteriorStore(state => state.mode)
  const walls = useInteriorStore(state => state.walls)
  const floors = useInteriorStore(state => state.floors)
  const surfaces = useInteriorStore(state => state.surfaces)
  const objects = useInteriorStore(state => state.objects)
  const selectedId = useInteriorStore(state => state.selectedId)
  const multiSelectedIds = useInteriorStore(state => state.multiSelectedIds)
  const setSelected = useInteriorStore(state => state.setSelected)
  const toggleMultiSelect = useInteriorStore(state => state.toggleMultiSelect)
  const removeWall = useInteriorStore(state => state.removeWall)
  const removeFloor = useInteriorStore(state => state.removeFloor)
  const removeSurface = useInteriorStore(state => state.removeSurface)
  const removeObject = useInteriorStore(state => state.removeObject)

  const groups = useMemo(() => partitionLayerSurfaces(surfaces), [surfaces])
  const actions = {
    selectedId,
    multiSelectedIds,
    setSelected,
    toggleMultiSelect,
    removeSurface,
    removeWall,
    removeFloor,
    removeObject,
  }

  if (mode === INTERACTION_MODE_TERRAIN) {
    return (
      <LayerPanelTerrainView
        groups={groups}
        walls={walls}
        floors={floors}
        objects={objects}
        actions={actions}
      />
    )
  }

  return (
    <LayerPanelSceneView
      groups={groups}
      walls={walls}
      floors={floors}
      objects={objects}
      actions={actions}
    />
  )
}
