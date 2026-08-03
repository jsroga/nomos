'use client'

import React from 'react'
import { useInteriorStore } from '@/domains/3d-canvas'
import { INTERACTION_MODE_SELECT, INTERACTION_MODE_SURFACE } from '@/domains/3d-canvas/constants/interaction-modes'
import { SurfaceRenderer } from './SurfaceRenderer'

export const SurfaceManager: React.FC = () => {
  const surfaces = useInteriorStore(state => state.surfaces)
  const activeLevel = useInteriorStore(state => state.activeLevel)
  const selectedId = useInteriorStore(state => state.selectedId)
  const setSelected = useInteriorStore(state => state.setSelected)
  const mode = useInteriorStore(state => state.mode)
  const removeSurface = useInteriorStore(state => state.removeSurface)
  const groundColor = useInteriorStore(state => state.terrainSettings.groundColor)
  const waterColor = useInteriorStore(state => state.terrainSettings.waterColor)

  return (
    <group>
      {surfaces.map(surface => {
        const surfaceLevel = surface.level ?? 0
        const isOnActiveLevel = surfaceLevel === activeLevel
        return (
          <group key={surface.id} position={[0, surfaceLevel * 3, 0]}>
            <SurfaceRenderer
              surface={surface}
              isSelected={surface.id === selectedId}
              onClick={e => {
                e.stopPropagation()
                if (mode === INTERACTION_MODE_SELECT) setSelected(surface.id)
                if (mode === INTERACTION_MODE_SURFACE && e.altKey) removeSurface(surface.id)
              }}
              opacity={isOnActiveLevel ? 1 : 0.3}
              groundColor={groundColor}
              waterColor={waterColor}
            />
          </group>
        )
      })}
    </group>
  )
}
