/* eslint-disable react/no-unknown-property */
'use client'

import React, { useMemo } from 'react'
import { useInteriorStore } from '@/domains/interior-designer/store/useInteriorStore'
import * as THREE from 'three'

export const TerrainBrushPreview: React.FC = () => {
  const terrainBrush = useInteriorStore(state => state.terrainBrush)
  const terrainBrushPosition = useInteriorStore(state => state.terrainBrushPosition)
  const mode = useInteriorStore(state => state.mode)

  // Get brush color based on type
  const brushColor = useMemo(() => {
    switch (terrainBrush.type) {
      case 'raise':
        return '#22c55e' // Green
      case 'lower':
        return '#ef4444' // Red
      case 'flatten':
        return '#f59e0b' // Amber
      case 'smooth':
        return '#3b82f6' // Blue
      default:
        return '#ffffff'
    }
  }, [terrainBrush.type])

  // Create circle geometry for brush preview
  const circleGeometry = useMemo(() => {
    const radius = terrainBrush.size / 10 // Scale brush size to world units
    const segments = 64
    const points: THREE.Vector3[] = []
    
    for (let i = 0; i <= segments; i++) {
      const angle = (i / segments) * Math.PI * 2
      points.push(new THREE.Vector3(
        Math.cos(angle) * radius,
        0.1, // Slightly above terrain
        Math.sin(angle) * radius
      ))
    }
    
    const geo = new THREE.BufferGeometry().setFromPoints(points)
    return geo
  }, [terrainBrush.size])

  // Only show when in terrain mode and we have a position
  if (mode !== 'TERRAIN' || !terrainBrushPosition) return null

  return (
    <group position={terrainBrushPosition}>
      {/* Brush circle outline */}
      <line geometry={circleGeometry}>
        <lineBasicMaterial color={brushColor} linewidth={2} />
      </line>
      
      {/* Center dot */}
      <mesh position={[0, 0.15, 0]}>
        <sphereGeometry args={[0.1]} />
        <meshBasicMaterial color={brushColor} />
      </mesh>
      
      {/* Filled circle preview (semi-transparent) */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.05, 0]}>
        <circleGeometry args={[terrainBrush.size / 10, 64]} />
        <meshBasicMaterial 
          color={brushColor} 
          transparent 
          opacity={0.15} 
          side={THREE.DoubleSide}
        />
      </mesh>
    </group>
  )
}

