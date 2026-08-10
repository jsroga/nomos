/* eslint-disable react/no-unknown-property */
'use client'

import React, { useRef, useState, useCallback } from 'react'
import { TERRAIN_MESH_NAME } from '@/domains/3d-canvas/constants/three-js'
import { useInteriorStore } from '@/domains/3d-canvas'
import { useThree, ThreeEvent } from '@react-three/fiber'
import * as THREE from 'three'

const TERRAIN_SIZE = 64 // Must match TerrainMesh
const BRUSH_UPDATE_THROTTLE_MS = 33 // ~30fps for brush position updates

export const TerrainTool: React.FC = () => {
  const terrainBrush = useInteriorStore(state => state.terrainBrush)
  const setTerrainBrushPosition = useInteriorStore(state => state.setTerrainBrushPosition)
  const updateHeightmapAt = useInteriorStore(state => state.updateHeightmapAt)
  const flushHeightmapVersion = useInteriorStore(state => state.flushHeightmapVersion)
  const setInteractionActive = useInteriorStore(state => state.setInteractionActive)
  const baseGroundHeight = useInteriorStore(state => state.terrainSettings.baseGroundHeight)
  const showWaterPlane = useInteriorStore(state => state.terrainSettings.showWaterPlane)
  const waterSurfaceHeight = useInteriorStore(state => state.terrainSettings.waterSurfaceHeight)

  const { raycaster, pointer, camera, scene } = useThree()

  const [isPainting, setIsPainting] = useState(false)
  const lastPaintPosition = useRef<THREE.Vector3 | null>(null)

  // OPTIMIZATION: Cache terrain mesh reference (avoid scene traversal every frame)
  const cachedTerrainMeshRef = useRef<THREE.Mesh | null>(null)
  const lastBrushUpdateRef = useRef<number>(0)

  // Find terrain mesh in scene (with caching)
  const findTerrainMesh = useCallback((): THREE.Mesh | null => {
    // Return cached if still valid (check if still in scene)
    if (cachedTerrainMeshRef.current && cachedTerrainMeshRef.current.parent) {
      return cachedTerrainMeshRef.current
    }

    // Traverse scene only if cache miss
    let terrainMesh: THREE.Mesh | null = null
    scene.traverse(obj => {
      if (obj.name === TERRAIN_MESH_NAME && obj instanceof THREE.Mesh) {
        terrainMesh = obj
      }
    })
    cachedTerrainMeshRef.current = terrainMesh
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
    const plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), -baseGroundHeight)
    const target = new THREE.Vector3()
    if (raycaster.ray.intersectPlane(plane, target)) {
      // Clamp to terrain bounds
      target.x = Math.max(-TERRAIN_SIZE / 2, Math.min(TERRAIN_SIZE / 2, target.x))
      target.z = Math.max(-TERRAIN_SIZE / 2, Math.min(TERRAIN_SIZE / 2, target.z))
      return target
    }

    return null
  }, [raycaster, pointer, camera, findTerrainMesh, baseGroundHeight])

  // Handle continuous painting
  const doPaint = useCallback(
    (position: THREE.Vector3) => {
      const brushRadius = terrainBrush.size / 10 // Convert to world units
      const strength = terrainBrush.strength * 0.05 // Scale strength

      // Check if Shift is held for material painting mode
      // For now, we'll use the brush type to determine action
      updateHeightmapAt(position.x, position.z, brushRadius, strength, terrainBrush.type)

      lastPaintPosition.current = position.clone()
    },
    [terrainBrush, updateHeightmapAt]
  )

  const handlePointerMove = useCallback(() => {
    const now = performance.now()

    // OPTIMIZATION: Throttle brush position updates (max 30fps for hover preview)
    const shouldUpdateBrush = now - lastBrushUpdateRef.current > BRUSH_UPDATE_THROTTLE_MS

    const point = getIntersection()
    if (point) {
      // Only update brush position at throttled rate
      if (shouldUpdateBrush) {
        setTerrainBrushPosition([point.x, point.y, point.z])
        lastBrushUpdateRef.current = now
      }

      if (isPainting) {
        // Only paint if we've moved enough distance
        if (
          !lastPaintPosition.current ||
          point.distanceTo(lastPaintPosition.current) > terrainBrush.size / 20
        ) {
          doPaint(point)
        }
      }
    }
  }, [getIntersection, setTerrainBrushPosition, isPainting, doPaint, terrainBrush.size])

  const handlePointerDown = useCallback(
    (e: ThreeEvent<PointerEvent>) => {
      if (e.button !== 0) return // Only left click

      const point = getIntersection()
      if (point) {
        setInteractionActive(true)
        setIsPainting(true)
        doPaint(point)
      }
    },
    [getIntersection, doPaint, setInteractionActive]
  )

  const handlePointerUp = useCallback(() => {
    setIsPainting(false)
    lastPaintPosition.current = null
    flushHeightmapVersion()
    setInteractionActive(false)
  }, [flushHeightmapVersion, setInteractionActive])

  const handlePointerLeave = useCallback(() => {
    setTerrainBrushPosition(null)
    setIsPainting(false)
    lastPaintPosition.current = null
    flushHeightmapVersion()
    setInteractionActive(false)
  }, [setTerrainBrushPosition, flushHeightmapVersion, setInteractionActive])

  return (
    <>
      <mesh
        rotation={[-Math.PI / 2, 0, 0]}
        position={[0, baseGroundHeight - 0.01, 0]}
        visible={false}
        onPointerMove={handlePointerMove}
        onPointerDown={handlePointerDown}
        onPointerUp={handlePointerUp}
        onPointerLeave={handlePointerLeave}
      >
        <planeGeometry args={[200, 200]} />
        <meshBasicMaterial transparent opacity={0} />
      </mesh>

      {/* Brush Radius Preview */}
      {terrainBrush.position && (
        <group
          position={[
            terrainBrush.position[0],
            terrainBrush.position[1] + 0.1,
            terrainBrush.position[2],
          ]}
        >
          <mesh rotation={[-Math.PI / 2, 0, 0]}>
            <ringGeometry args={[terrainBrush.size / 10 - 0.05, terrainBrush.size / 10, 32]} />
            <meshBasicMaterial color="#3b82f6" transparent opacity={0.5} side={THREE.DoubleSide} />
          </mesh>
          {/* Outer glow or subtle fill */}
          <mesh rotation={[-Math.PI / 2, 0, 0]}>
            <ringGeometry args={[0, terrainBrush.size / 10, 32]} />
            <meshBasicMaterial color="#3b82f6" transparent opacity={0.1} side={THREE.DoubleSide} />
          </mesh>
        </group>
      )}

      {/* Water Level Reference Plane (Visual aid when editing height) */}
      {!showWaterPlane && (
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, waterSurfaceHeight, 0]}>
          <planeGeometry args={[TERRAIN_SIZE, TERRAIN_SIZE]} />
          <meshBasicMaterial color="#06b6d4" transparent opacity={0.05} side={THREE.DoubleSide} />
        </mesh>
      )}
    </>
  )
}
