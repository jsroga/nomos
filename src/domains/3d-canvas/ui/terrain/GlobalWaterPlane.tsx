/* eslint-disable react/no-unknown-property */
'use client'

import React, { useRef } from 'react'
import { GROUND_SURFACE_TYPES_FOR_WATER } from '@/domains/3d-canvas/constants/ground-surfaces'
import { INTERACTION_MODE_TERRAIN } from '@/domains/3d-canvas/constants/interaction-modes'
import { useInteriorStore } from '@/domains/3d-canvas'
import { resolveEffectiveRenderConfig } from '@/domains/3d-canvas/core/render-quality'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'

const WATER_PLANE_SIZE = 100

export const GlobalWaterPlane: React.FC = () => {
  const meshRef = useRef<THREE.Mesh>(null)
  const waterSurfaceHeight = useInteriorStore(state => state.terrainSettings.waterSurfaceHeight)
  const showWaterPlane = useInteriorStore(state => state.terrainSettings.showWaterPlane)
  const heightmap = useInteriorStore(state => state.terrainSettings.heightmap)
  const waterColor = useInteriorStore(state => state.terrainSettings.waterColor)
  const waterOpacity = useInteriorStore(state => state.terrainSettings.waterOpacity)
  const mode = useInteriorStore(state => state.mode)
  const surfaces = useInteriorStore(state => state.surfaces)
  const renderQuality = useInteriorStore(state => state.renderQuality)
  const interactionActive = useInteriorStore(state => state.interactionActive)

  const effective = resolveEffectiveRenderConfig(renderQuality, interactionActive)
  const hasGroundSurface = surfaces.some(s => GROUND_SURFACE_TYPES_FOR_WATER.includes(s.type))
  const visible =
    hasGroundSurface && !!heightmap && mode === INTERACTION_MODE_TERRAIN && showWaterPlane

  useFrame(state => {
    if (!visible || !meshRef.current || interactionActive) return
    const time = state.clock.getElapsedTime()
    meshRef.current.position.y = waterSurfaceHeight + Math.sin(time * 0.5) * 0.02
  })

  if (!visible) return null

  return (
    <mesh
      ref={meshRef}
      rotation={[-Math.PI / 2, 0, 0]}
      position={[0, waterSurfaceHeight, 0]}
      name="water-plane"
    >
      <planeGeometry args={[WATER_PLANE_SIZE, WATER_PLANE_SIZE, 32, 32]} />
      {effective.waterTransmission ? (
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
      ) : (
        <meshStandardMaterial
          color={waterColor}
          transparent
          opacity={waterOpacity}
          roughness={0.2}
          metalness={0.1}
          side={THREE.DoubleSide}
        />
      )}
    </mesh>
  )
}
