/* eslint-disable react/no-unknown-property */
'use client'

import React, { useState, useMemo, useEffect } from 'react'
import { useInteriorStore, SurfaceType } from '@/domains/interior-designer'
import { useThree, ThreeEvent } from '@react-three/fiber'
import * as THREE from 'three'
import { Line } from '@react-three/drei'

type SurfacePreviewGeometry =
  | { type: 'shape'; shape: THREE.Shape; color: string }
  | { type: 'line'; points: THREE.Vector3[]; width: number; color: string }
  | { type: 'curve'; path: THREE.CatmullRomCurve3; width: number; color: string }

// Constants for different surface types
const SURFACE_CONFIG: Record<
  SurfaceType,
  { width?: number; isPath: boolean; color: string; layer: number }
> = {
  grass: { isPath: false, color: '#4ade80', layer: 0 },
  water: { isPath: false, color: '#06b6d4', layer: 1 },
  dirt: { isPath: true, width: 2, color: '#d97706', layer: 2 },
  road: { isPath: true, width: 4, color: '#374151', layer: 3 },
  pavement: { isPath: false, color: '#9ca3af', layer: 4 },
  mars: { isPath: false, color: '#9f3528', layer: 0 }, // Same layer as grass (base)
  sand: { isPath: false, color: '#fcd34d', layer: 0 },
  rock: { isPath: true, width: 3, color: '#57534e', layer: 2 },
}

export const SurfaceTool: React.FC = () => {
  const mode = useInteriorStore(state => state.mode)
  const addSurface = useInteriorStore(state => state.addSurface)
  const activeLevel = useInteriorStore(state => state.activeLevel)
  const { raycaster, pointer, camera } = useThree()

  // Local state for the drawing session
  const [points, setPoints] = useState<[number, number, number][]>([])
  const [currentPoint, setCurrentPoint] = useState<THREE.Vector3 | null>(null)

  // Settings that could eventually be moved to a UI panel
  const activeType = useInteriorStore(state => state.activeSurfaceType)
  const isCurved = useInteriorStore(state => state.isCurved)
  const setIsCurved = useInteriorStore(state => state.setIsCurved)

  // Listen for key toggles (C for Curve)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'c') setIsCurved(!isCurved)
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isCurved, setIsCurved])

  const allSurfaces = useInteriorStore(state => state.surfaces) // Get all surfaces for snapping

  const getIntersection = () => {
    raycaster.setFromCamera(pointer, camera)
    const plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), -activeLevel * 3)
    const target = new THREE.Vector3()
    raycaster.ray.intersectPlane(plane, target)

    if (target) {
      // 1. Basic Grid Snap
      target.x = Math.round(target.x * 4) / 4
      target.z = Math.round(target.z * 4) / 4
      target.y = 0

      // 2. Point Snapping (Enhanced)
      let closestPoint: THREE.Vector3 | null = null
      let minDistance = 0.5 // Snap threshold

      // Iterate over all existing surface points
      allSurfaces.forEach(s => {
        if (!s.points) return
        s.points.forEach(p => {
          const existing = new THREE.Vector3(p[0], 0, p[2])
          const dist = existing.distanceTo(target)
          if (dist < minDistance) {
            minDistance = dist
            closestPoint = existing
          }
        })
      })

      // Also snap to current drawing points (closing loop)
      if (points.length > 0) {
        const start = new THREE.Vector3(...points[0])
        const dist = start.distanceTo(target)
        if (dist < minDistance) {
          closestPoint = start
        }
      }

      if (closestPoint) {
        // Visualize snap? The cursor will jump, which is visual enough.
        // We could add a different color cursor if snapped?
        return closestPoint
      }

      // Console log case 1: Intersection
      // console.log('GetIntersection:', target)
      return target
    }
    return null
  }

  const handlePointerMove = () => {
    if (mode !== 'SURFACE') return
    const point = getIntersection()
    if (point) {
      setCurrentPoint(point)
    }
  }

  // Auto-cancel when switching away from SURFACE mode
  useEffect(() => {
    if (mode !== 'SURFACE') {
      setPoints([])
      setCurrentPoint(null)
    }
  }, [mode])

  const handleContextMenu = (e: ThreeEvent<MouseEvent>) => {
    e.stopPropagation() // Prevent default browser context menu if possible, usually handled by canvas prevents
    // Finish Surface
    if (points.length >= 2) {
      const config = SURFACE_CONFIG[activeType]
      const isArea = !config.isPath
      finishSurface(isArea)
    }
  }

  const handlePointerDown = (e: ThreeEvent<PointerEvent>) => {
    if (mode !== 'SURFACE') return
    // Right click check for some browsers/devices might be e.button === 2
    // But we'll try to use onContextMenu for cleaner separate handling or check button here
    if (e.button === 2) return // Handled by onContextMenu

    const point = getIntersection()
    if (!point) return

    // Check for closing loop (Area) or finishing (Path)
    if (points.length > 0) {
      const last = new THREE.Vector3(...points[points.length - 1])
      const start = new THREE.Vector3(...points[0])
      const current = new THREE.Vector3(point.x, point.y, point.z)

      const config = SURFACE_CONFIG[activeType]
      const isArea = !config.isPath

      if (isArea && start.distanceTo(current) < 1.0 && points.length > 2) {
        // Close Loop
        finishSurface(true)
        return
      }

      if (!isArea && last.distanceTo(current) < 0.5) {
        // Clicked on last point -> Finish Path
        finishSurface(false)
        return
      }
    }

    setPoints([...points, [point.x, point.y, point.z]])
  }

  const finishSurface = (closed: boolean) => {
    const config = SURFACE_CONFIG[activeType]

    const isRoad = activeType === 'road'

    if (points.length < 2) return

    addSurface({
      type: activeType,
      points: points,
      isPath: config.isPath,
      curved: isCurved,
      width: config.width,
      layerIndex: config.layer,
      // Vertical Road Defaults
      isVertical: isRoad,
      height: isRoad ? 0.1 : undefined,
      rotation: [0, 0, 0],
    })
    setPoints([])
  }

  // --- Preview Generation ---

  const previewGeometry = useMemo((): SurfacePreviewGeometry | null => {
    if (mode !== 'SURFACE' || points.length === 0 || !currentPoint) return null

    const allPoints = [...points.map(p => new THREE.Vector3(...p)), currentPoint]

    // Safety check for invalid types
    const config = SURFACE_CONFIG[activeType] || SURFACE_CONFIG['grass']

    if (config.isPath) {
      // Path Preview (Line or Tube)
      if (isCurved && allPoints.length > 1) {
        const curve = new THREE.CatmullRomCurve3(allPoints, false, 'catmullrom', 0.5)
        return { type: 'curve', path: curve, width: config.width || 1, color: config.color }
      } else {
        return { type: 'line', points: allPoints, width: config.width || 1, color: config.color }
      }
    } else {
      // Area Preview (Shape)
      const shape = new THREE.Shape()
      shape.moveTo(allPoints[0].x, allPoints[0].z) // Mapping X->X, Z->Y (Shape Y)

      if (isCurved && allPoints.length > 2) {
        for (let i = 1; i < allPoints.length; i++) shape.lineTo(allPoints[i].x, allPoints[i].z)
      } else {
        for (let i = 1; i < allPoints.length; i++) shape.lineTo(allPoints[i].x, allPoints[i].z)
      }
      shape.lineTo(allPoints[0].x, allPoints[0].z) // Close it visually

      return { type: 'shape', shape, color: config.color }
    }
  }, [points, currentPoint, activeType, isCurved, mode])

  // Check mode at render time, but AFTER all hooks
  if (mode !== 'SURFACE') return null

  return (
    <group position={[0, activeLevel * 3, 0]}>
      {/* Interaction Plane */}
      <mesh
        rotation={[-Math.PI / 2, 0, 0]}
        position={[0, 0.02, 0]} // Slightly above generic ground
        visible={false}
        onPointerMove={handlePointerMove}
        onPointerDown={handlePointerDown}
        onContextMenu={handleContextMenu}
      >
        <planeGeometry args={[1000, 1000]} />
      </mesh>

      {/* Cursor */}
      {currentPoint && (
        <mesh position={currentPoint}>
          <sphereGeometry args={[0.3]} />
          <meshBasicMaterial color={SURFACE_CONFIG[activeType].color} opacity={0.5} transparent />
        </mesh>
      )}

      {/* Points */}
      {points.map((p, i) => (
        <mesh key={i} position={new THREE.Vector3(...p)}>
          <sphereGeometry args={[0.2]} />
          <meshBasicMaterial color="white" />
        </mesh>
      ))}

      {/* Preview Render */}
      {previewGeometry && (
        <>
          {previewGeometry.type === 'shape' && (
            <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, 0.05, 0]}>
              <shapeGeometry args={[previewGeometry.shape]} />
              <meshBasicMaterial
                color={previewGeometry.color}
                opacity={0.4}
                transparent
                side={THREE.DoubleSide}
              />
            </mesh>
          )}

          {previewGeometry.type === 'line' && (
            <Line
              points={previewGeometry.points}
              color={previewGeometry.color}
              lineWidth={2}
              dashed
            />
          )}

          {previewGeometry.type === 'curve' && (
            // Visualize curve path
            <mesh position={[0, 0.05, 0]}>
              <tubeGeometry
                args={[
                  previewGeometry.path,
                  64,
                  (previewGeometry.width || 1) / 2,
                  8,
                  false,
                ]}
              />
              <meshBasicMaterial
                color={previewGeometry.color}
                opacity={0.4}
                transparent
                wireframe
              />
            </mesh>
          )}
        </>
      )}

      {/* UI Controls (Temp - should be in DOM) */}
      {/* We'll control this via the Toolbar state later */}
    </group>
  )
}
