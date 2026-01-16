/* eslint-disable react/no-unknown-property */
'use client'

import React, { useMemo } from 'react'
import { useInteriorStore } from '@/domains/interior-designer/store/useInteriorStore'
import * as THREE from 'three'

// Ground surface types
const GROUND_SURFACE_TYPES = ['grass', 'dirt', 'sand', 'rock']

export const TerrainBrushPreview: React.FC = () => {
  const terrainBrush = useInteriorStore(state => state.terrainBrush)
  const terrainBrushPosition = useInteriorStore(state => state.terrainBrushPosition)
  const mode = useInteriorStore(state => state.mode)
  const surfaces = useInteriorStore(state => state.surfaces)

  // Check if there are any ground surfaces
  const hasGroundSurface = surfaces.some(s => GROUND_SURFACE_TYPES.includes(s.type))

  // Force neutral color
  const brushColor = '#ffffff'

  // Create circle geometry for brush preview
  const circleGeometry = useMemo(() => {
    const radius = terrainBrush.size / 10 // Scale brush size to world units
    const segments = 64
    const points: THREE.Vector3[] = []

    for (let i = 0; i <= segments; i++) {
      const angle = (i / segments) * Math.PI * 2
      points.push(
        new THREE.Vector3(
          Math.cos(angle) * radius,
          0.1, // Slightly above terrain
          Math.sin(angle) * radius
        )
      )
    }

    const geo = new THREE.BufferGeometry().setFromPoints(points)
    return geo
  }, [terrainBrush.size])

  // Only show when:
  // 1. In terrain mode
  // 2. There are ground surfaces
  // 3. We have a brush position (meaning we're hovering over a surface)
  if (mode !== 'TERRAIN' || !hasGroundSurface || !terrainBrushPosition) return null

  return (
    <group position={terrainBrushPosition}>
      {/* Brush circle outline */}
      <line geometry={circleGeometry}>
        <lineBasicMaterial color={brushColor} linewidth={1} transparent opacity={0.5} />
      </line>

      {/* Center dot */}
      <mesh position={[0, 0.15, 0]}>
        <sphereGeometry args={[0.05]} />
        <meshBasicMaterial color={brushColor} />
      </mesh>
    </group>
  )
}
