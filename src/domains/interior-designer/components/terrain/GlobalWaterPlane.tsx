/* eslint-disable react/no-unknown-property */
'use client'

import React, { useRef } from 'react'
import { useInteriorStore } from '@/domains/interior-designer/store/useInteriorStore'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'

const WATER_PLANE_SIZE = 100 // Large plane to cover the scene

export const GlobalWaterPlane: React.FC = () => {
  const meshRef = useRef<THREE.Mesh>(null)
  const terrainSettings = useInteriorStore(state => state.terrainSettings)
  const mode = useInteriorStore(state => state.mode)
  const surfaces = useInteriorStore(state => state.surfaces)

  const { waterSurfaceHeight, showWaterPlane, heightmap, waterColor, waterOpacity } =
    terrainSettings

  // Check if there are any ground surfaces
  const groundSurfaceTypes = ['grass', 'dirt', 'sand', 'rock']
  const hasGroundSurface = surfaces.some(s => groundSurfaceTypes.includes(s.type))

  // Animate water slightly
  useFrame(state => {
    if (!meshRef.current) return
    // Subtle wave animation
    const time = state.clock.getElapsedTime()
    meshRef.current.position.y = waterSurfaceHeight + Math.sin(time * 0.5) * 0.02
  })

  // Only show when ground surface exists, heightmap initialized, in terrain mode, and showWaterPlane is true
  if (!hasGroundSurface || !heightmap || mode !== 'TERRAIN' || !showWaterPlane) return null

  return (
    <mesh
      ref={meshRef}
      rotation={[-Math.PI / 2, 0, 0]}
      position={[0, waterSurfaceHeight, 0]}
      name="water-plane"
    >
      <planeGeometry args={[WATER_PLANE_SIZE, WATER_PLANE_SIZE, 32, 32]} />
      <meshPhysicalMaterial
        color={waterColor}
        transparent
        opacity={waterOpacity}
        roughness={0.1}
        metalness={0.2}
        transmission={0.6}
        thickness={0.5}
        ior={1.33}
        side={THREE.DoubleSide}
      />
    </mesh>
  )
}
