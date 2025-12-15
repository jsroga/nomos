/* eslint-disable react/no-unknown-property */
'use client'

import React, { useMemo, useRef, useEffect } from 'react'
import { useInteriorStore } from '@/domains/interior-designer/store/useInteriorStore'
import * as THREE from 'three'

const TERRAIN_SIZE = 64 // World units (meters)

export const TerrainMesh: React.FC = () => {
  const meshRef = useRef<THREE.Mesh>(null)
  const terrainSettings = useInteriorStore(state => state.terrainSettings)
  const mode = useInteriorStore(state => state.mode)

  const { heightmap, heightmapSize, materialMap, baseGroundHeight, waterSurfaceHeight } = terrainSettings



  // Create geometry with proper vertex displacement
  const geometry = useMemo(() => {
    const size = heightmapSize || 64
    const segments = size - 1
    const geo = new THREE.PlaneGeometry(TERRAIN_SIZE, TERRAIN_SIZE, segments, segments)

    // Rotate to be horizontal (XZ plane)
    geo.rotateX(-Math.PI / 2)

    return geo
  }, [heightmapSize])

  // Update vertex positions based on heightmap
  useEffect(() => {
    if (!meshRef.current || !heightmap) return

    const geo = meshRef.current.geometry as THREE.PlaneGeometry
    const positions = geo.attributes.position
    const size = heightmapSize || 64

    for (let i = 0; i < positions.count; i++) {
      const height = heightmap[i] ?? baseGroundHeight
      positions.setY(i, height)
    }

    positions.needsUpdate = true
    geo.computeVertexNormals()
  }, [heightmap, heightmapSize, baseGroundHeight])

  // Create vertex colors based on material map
  const colors = useMemo(() => {
    const size = heightmapSize || 64
    const colorArray = new Float32Array(size * size * 3)

    const groundColor = new THREE.Color('#6b7280') // Gray ground
    const waterColor = new THREE.Color('#0891b2') // Cyan water
    const grassColor = new THREE.Color('#4ade80') // Green grass

    for (let i = 0; i < size * size; i++) {
      const isWater = materialMap ? materialMap[i] === 1 : false
      const height = heightmap ? heightmap[i] : baseGroundHeight

      // Auto-determine color based on height if no material map
      let color: THREE.Color
      if (isWater || (height < waterSurfaceHeight)) {
        color = waterColor
      } else if (height > baseGroundHeight + 1) {
        color = grassColor
      } else {
        color = groundColor
      }

      colorArray[i * 3] = color.r
      colorArray[i * 3 + 1] = color.g
      colorArray[i * 3 + 2] = color.b
    }

    return colorArray
  }, [heightmap, materialMap, heightmapSize, baseGroundHeight, waterSurfaceHeight])

  // Update vertex colors
  useEffect(() => {
    if (!meshRef.current) return

    const geo = meshRef.current.geometry as THREE.PlaneGeometry
    geo.setAttribute('color', new THREE.BufferAttribute(colors, 3))
  }, [colors])

  // Only render when in terrain mode or when there's heightmap data
  if (mode !== 'TERRAIN' && !heightmap) return null

  return (
    <mesh
      ref={meshRef}
      geometry={geometry}
      receiveShadow
      castShadow
      name="terrain-mesh"
    >
      <meshStandardMaterial
        vertexColors
        side={THREE.DoubleSide}
        roughness={0.9}
        metalness={0.1}
        flatShading={false}
      />
    </mesh>
  )
}

