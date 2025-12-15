/* eslint-disable react/no-unknown-property */
'use client'

import React, { useRef, useState, useCallback } from 'react'
import { useInteriorStore } from '@/domains/interior-designer/store/useInteriorStore'
import { useThree } from '@react-three/fiber'
import * as THREE from 'three'

const TERRAIN_SIZE = 64 // Must match TerrainMesh

export const TerrainTool: React.FC = () => {
  const mode = useInteriorStore(state => state.mode)
  const terrainBrush = useInteriorStore(state => state.terrainBrush)
  const terrainMaterialPaint = useInteriorStore(state => state.terrainMaterialPaint)
  const setTerrainBrushPosition = useInteriorStore(state => state.setTerrainBrushPosition)
  const updateHeightmapAt = useInteriorStore(state => state.updateHeightmapAt)
  const paintMaterialAt = useInteriorStore(state => state.paintMaterialAt)
  const terrainSettings = useInteriorStore(state => state.terrainSettings)

  const { raycaster, pointer, camera, scene } = useThree()

  const [isPainting, setIsPainting] = useState(false)
  const lastPaintPosition = useRef<THREE.Vector3 | null>(null)
  const paintIntervalRef = useRef<number | null>(null)




  // Find terrain mesh in scene
  const findTerrainMesh = useCallback((): THREE.Mesh | null => {
    let terrainMesh: THREE.Mesh | null = null
    scene.traverse((obj) => {
      if (obj.name === 'terrain-mesh' && obj instanceof THREE.Mesh) {
        terrainMesh = obj
      }
    })
    return terrainMesh
  }, [scene])

  // Get intersection with terrain or ground plane
  const getIntersection = useCallback((): THREE.Vector3 | null => {
    raycaster.setFromCamera(pointer, camera)

    // Try to hit terrain mesh first
    const terrainMesh = findTerrainMesh()
    if (terrainMesh) {
      const intersects = raycaster.intersectObject(terrainMesh, false)
      if (intersects.length > 0) {
        return intersects[0].point.clone()
      }
    }

    // Fallback to ground plane at base height
    const plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), -terrainSettings.baseGroundHeight)
    const target = new THREE.Vector3()
    if (raycaster.ray.intersectPlane(plane, target)) {
      // Clamp to terrain bounds
      target.x = Math.max(-TERRAIN_SIZE / 2, Math.min(TERRAIN_SIZE / 2, target.x))
      target.z = Math.max(-TERRAIN_SIZE / 2, Math.min(TERRAIN_SIZE / 2, target.z))
      return target
    }

    return null
  }, [raycaster, pointer, camera, findTerrainMesh, terrainSettings.baseGroundHeight])

  // Handle continuous painting
  const doPaint = useCallback((position: THREE.Vector3) => {
    const brushRadius = terrainBrush.size / 10 // Convert to world units
    const strength = terrainBrush.strength * 0.05 // Scale strength

    // Check if Shift is held for material painting mode
    // For now, we'll use the brush type to determine action
    updateHeightmapAt(position.x, position.z, brushRadius, strength, terrainBrush.type)

    lastPaintPosition.current = position.clone()
  }, [terrainBrush, updateHeightmapAt])

  const handlePointerMove = useCallback(() => {
    const point = getIntersection()
    if (point) {
      setTerrainBrushPosition([point.x, point.y, point.z])

      if (isPainting) {
        // Only paint if we've moved enough distance
        if (!lastPaintPosition.current ||
          point.distanceTo(lastPaintPosition.current) > terrainBrush.size / 20) {
          doPaint(point)
        }
      }
    }
  }, [getIntersection, setTerrainBrushPosition, isPainting, doPaint, terrainBrush.size])

  const handlePointerDown = useCallback((e: any) => {
    if (e.button !== 0) return // Only left click

    const point = getIntersection()
    if (point) {
      setIsPainting(true)
      doPaint(point)
    }
  }, [getIntersection, doPaint])

  const handlePointerUp = useCallback(() => {
    setIsPainting(false)
    lastPaintPosition.current = null
  }, [])

  const handlePointerLeave = useCallback(() => {
    setTerrainBrushPosition(null)
    setIsPainting(false)
    lastPaintPosition.current = null
  }, [setTerrainBrushPosition])

  if (mode !== 'TERRAIN') {
    return null;
  }

  return (
    <mesh
      rotation={[-Math.PI / 2, 0, 0]}
      position={[0, terrainSettings.baseGroundHeight - 0.01, 0]}
      visible={false}
      onPointerMove={handlePointerMove}
      onPointerDown={handlePointerDown}
      onPointerUp={handlePointerUp}
      onPointerLeave={handlePointerLeave}
    >
      <planeGeometry args={[200, 200]} />
      <meshBasicMaterial transparent opacity={0} />
    </mesh>
  )
}

