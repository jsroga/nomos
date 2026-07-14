/* eslint-disable react/no-unknown-property */
'use client'

import React, { useState, useMemo } from 'react'
import { INTERACTION_MODE_WALL } from '@/domains/interior-designer/constants/interaction-modes'
import {
  ADDING_WALL_LOG,
  CREATING_FLOOR_LOG,
} from '@/domains/interior-designer/constants/wall-tool-messages'
import { useInteriorStore } from '@/domains/interior-designer'
import { useThree, ThreeEvent } from '@react-three/fiber'
import * as THREE from 'three'
import { findClosedPolygons } from '../../core/polygonUtils'

const SNAP_DISTANCE = 0.5 // Distance to snap to existing wall endpoints
const GRID_SNAP = 0.5 // Grid snap size

export const WallTool: React.FC = () => {
  const mode = useInteriorStore(state => state.mode)
  const addWall = useInteriorStore(state => state.addWall)
  const addFloor = useInteriorStore(state => state.addFloor)
  const walls = useInteriorStore(state => state.walls)
  const activeLevel = useInteriorStore(state => state.activeLevel)
  const { raycaster, pointer, camera } = useThree()

  const [startPoint, setStartPoint] = useState<THREE.Vector3 | null>(null)
  const [currentPoint, setCurrentPoint] = useState<THREE.Vector3 | null>(null)
  const [isSnappedToEndpoint, setIsSnappedToEndpoint] = useState(false)

  // Collect all wall endpoints for snapping
  const wallEndpoints = useMemo(() => {
    const endpoints: THREE.Vector3[] = []
    walls.forEach(wall => {
      endpoints.push(new THREE.Vector3(wall.start[0], wall.start[1], wall.start[2]))
      endpoints.push(new THREE.Vector3(wall.end[0], wall.end[1], wall.end[2]))
    })
    return endpoints
  }, [walls])

  // Reset state when switching away from WALL mode
  React.useEffect(() => {
    if (mode !== INTERACTION_MODE_WALL) {
      setStartPoint(null)
      setCurrentPoint(null)
    }
  }, [mode])

  // Only active in WALL mode
  if (mode !== INTERACTION_MODE_WALL) return null

  const findNearestEndpoint = (point: THREE.Vector3): THREE.Vector3 | null => {
    let nearest: THREE.Vector3 | null = null
    let minDistance = SNAP_DISTANCE

    for (const endpoint of wallEndpoints) {
      // Only check x and z distance (ignore y for 2D floor plan snapping)
      const dx = point.x - endpoint.x
      const dz = point.z - endpoint.z
      const dist = Math.sqrt(dx * dx + dz * dz)
      if (dist < minDistance) {
        minDistance = dist
        nearest = endpoint.clone()
      }
    }

    return nearest
  }

  const getIntersection = () => {
    raycaster.setFromCamera(pointer, camera)
    // Intersect with a virtual ground plane at current level height
    const plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), -activeLevel * 3)
    const target = new THREE.Vector3()
    raycaster.ray.intersectPlane(plane, target)

    if (target) {
      // First, check if we should snap to an existing wall endpoint
      const nearestEndpoint = findNearestEndpoint(target)
      if (nearestEndpoint) {
        setIsSnappedToEndpoint(true)
        return nearestEndpoint
      }

      // Otherwise, snap to grid
      setIsSnappedToEndpoint(false)
      target.x = Math.round(target.x / GRID_SNAP) * GRID_SNAP
      target.z = Math.round(target.z / GRID_SNAP) * GRID_SNAP
      target.y = 0 // Local Y
      return target
    }
    return null
  }

  const handlePointerMove = () => {
    const point = getIntersection()
    if (point) {
      setCurrentPoint(point)
    }
  }

  const handlePointerDown = (_e: ThreeEvent<PointerEvent>) => {
    const point = getIntersection()
    if (!point) return

    if (!startPoint) {
      setStartPoint(point)
    } else {
      const newWallStart: [number, number, number] = [startPoint.x, startPoint.y, startPoint.z]
      const newWallEnd: [number, number, number] = [point.x, point.y, point.z]

      // Check if this wall would close a polygon
      const closedPolygon = findClosedPolygons(walls, newWallStart, newWallEnd)

      // Add the wall
      console.log(ADDING_WALL_LOG, { start: newWallStart, end: newWallEnd })
      addWall({
        start: newWallStart,
        end: newWallEnd,
        height: 3,
        thickness: 0.2,
        level: activeLevel,
      })

      // If a closed polygon was formed, auto-create a floor
      if (closedPolygon && closedPolygon.length >= 3) {
        console.log(CREATING_FLOOR_LOG, closedPolygon)
        addFloor({
          points: closedPolygon,
          y: 0,
          level: activeLevel,
        })
        // If we closed a room, stop the chain
        setStartPoint(null)
      } else {
        // Continue the chain from the end point
        setStartPoint(point)
      }
    }
  }

  // Add a transparent plane to catch mouse events
  return (
    <group position={[0, activeLevel * 3, 0]}>
      {/* Preview Ghost Wall */}
      {startPoint && currentPoint && (
        <mesh
          position={[(startPoint.x + currentPoint.x) / 2, 1.5, (startPoint.z + currentPoint.z) / 2]}
          rotation={[
            0,
            -Math.atan2(currentPoint.z - startPoint.z, currentPoint.x - startPoint.x),
            0,
          ]}
        >
          <boxGeometry args={[startPoint.distanceTo(currentPoint), 3, 0.2]} />
          <meshStandardMaterial color="#4f46e5" transparent opacity={0.5} />
        </mesh>
      )}

      {/* Interaction Plane */}
      <mesh
        rotation={[-Math.PI / 2, 0, 0]}
        position={[0, -0.01, 0]}
        visible={false}
        onPointerMove={handlePointerMove}
        onPointerDown={handlePointerDown}
      >
        <planeGeometry args={[1000, 1000]} />
      </mesh>

      {/* Cursor Indicator - changes color when snapping to endpoint */}
      {currentPoint && (
        <mesh position={currentPoint}>
          <sphereGeometry args={[isSnappedToEndpoint ? 0.15 : 0.1]} />
          <meshBasicMaterial color={isSnappedToEndpoint ? '#22c55e' : '#ef4444'} />
        </mesh>
      )}

      {/* Show all existing endpoints as small dots for reference */}
      {wallEndpoints.map((endpoint, i) => (
        <mesh key={i} position={endpoint}>
          <sphereGeometry args={[0.08]} />
          <meshBasicMaterial color="#6366f1" transparent opacity={0.6} />
        </mesh>
      ))}
    </group>
  )
}
