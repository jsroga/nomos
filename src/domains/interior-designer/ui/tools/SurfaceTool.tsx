/* eslint-disable react/no-unknown-property */
'use client'

import React, { useState, useMemo, useEffect } from 'react'
import { useInteriorStore } from '@/domains/interior-designer'
import { useThree, ThreeEvent } from '@react-three/fiber'
import * as THREE from 'three'
import { Line } from '@react-three/drei'
import { INTERACTION_MODE_SURFACE } from '@/domains/interior-designer/constants/interaction-modes'
import { SurfaceGeometryKind, SurfaceMaterialColor } from '@/domains/interior-designer/constants/surface-render-config'
import {
  SURFACE_TOOL_CONFIG,
  SURFACE_TOOL_CURVE_TYPE,
  SURFACE_TOOL_DEFAULT_TYPE,
} from '@/domains/interior-designer/constants/surface-tool-config'
import { SurfaceTypeValue } from '@/domains/interior-designer/constants/terrain-defaults'
import { DOM_EVENT_KEYDOWN } from '@/domains/interior-designer/constants/keyboard'

type SurfacePreviewGeometry =
  | { type: SurfaceGeometryKind.Shape; shape: THREE.Shape; color: string }
  | { type: SurfaceGeometryKind.Line; points: THREE.Vector3[]; width: number; color: string }
  | { type: SurfaceGeometryKind.Curve; path: THREE.CatmullRomCurve3; width: number; color: string }

export const SurfaceTool: React.FC = () => {
  const mode = useInteriorStore(state => state.mode)
  const addSurface = useInteriorStore(state => state.addSurface)
  const activeLevel = useInteriorStore(state => state.activeLevel)
  const { raycaster, pointer, camera } = useThree()

  const [points, setPoints] = useState<[number, number, number][]>([])
  const [currentPoint, setCurrentPoint] = useState<THREE.Vector3 | null>(null)

  const activeType = useInteriorStore(state => state.activeSurfaceType)
  const isCurved = useInteriorStore(state => state.isCurved)
  const setIsCurved = useInteriorStore(state => state.setIsCurved)

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'c') setIsCurved(!isCurved)
    }
    window.addEventListener(DOM_EVENT_KEYDOWN, handleKeyDown)
    return () => window.removeEventListener(DOM_EVENT_KEYDOWN, handleKeyDown)
  }, [isCurved, setIsCurved])

  const allSurfaces = useInteriorStore(state => state.surfaces)

  const getIntersection = () => {
    raycaster.setFromCamera(pointer, camera)
    const plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), -activeLevel * 3)
    const target = new THREE.Vector3()
    raycaster.ray.intersectPlane(plane, target)

    if (target) {
      target.x = Math.round(target.x * 4) / 4
      target.z = Math.round(target.z * 4) / 4
      target.y = 0

      let closestPoint: THREE.Vector3 | null = null
      let minDistance = 0.5

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

      if (points.length > 0) {
        const start = new THREE.Vector3(...points[0])
        const dist = start.distanceTo(target)
        if (dist < minDistance) {
          closestPoint = start
        }
      }

      if (closestPoint) {
        return closestPoint
      }

      return target
    }
    return null
  }

  const handlePointerMove = () => {
    if (mode !== INTERACTION_MODE_SURFACE) return
    const point = getIntersection()
    if (point) {
      setCurrentPoint(point)
    }
  }

  useEffect(() => {
    if (mode !== INTERACTION_MODE_SURFACE) {
      setPoints([])
      setCurrentPoint(null)
    }
  }, [mode])

  const handleContextMenu = (e: ThreeEvent<MouseEvent>) => {
    e.stopPropagation()
    if (points.length >= 2) {
      const config = SURFACE_TOOL_CONFIG[activeType]
      const isArea = !config.isPath
      finishSurface(isArea)
    }
  }

  const handlePointerDown = (e: ThreeEvent<PointerEvent>) => {
    if (mode !== INTERACTION_MODE_SURFACE) return
    if (e.button === 2) return

    const point = getIntersection()
    if (!point) return

    if (points.length > 0) {
      const last = new THREE.Vector3(...points[points.length - 1])
      const start = new THREE.Vector3(...points[0])
      const current = new THREE.Vector3(point.x, point.y, point.z)

      const config = SURFACE_TOOL_CONFIG[activeType]
      const isArea = !config.isPath

      if (isArea && start.distanceTo(current) < 1.0 && points.length > 2) {
        finishSurface(true)
        return
      }

      if (!isArea && last.distanceTo(current) < 0.5) {
        finishSurface(false)
        return
      }
    }

    setPoints([...points, [point.x, point.y, point.z]])
  }

  const finishSurface = (_closed: boolean) => {
    const config = SURFACE_TOOL_CONFIG[activeType]
    const isRoad = activeType === SurfaceTypeValue.Road

    if (points.length < 2) return

    addSurface({
      type: activeType,
      points: points,
      isPath: config.isPath,
      curved: isCurved,
      width: config.width,
      layerIndex: config.layer,
      isVertical: isRoad,
      height: isRoad ? 0.1 : undefined,
      rotation: [0, 0, 0],
    })
    setPoints([])
  }

  const previewGeometry = useMemo((): SurfacePreviewGeometry | null => {
    if (mode !== INTERACTION_MODE_SURFACE || points.length === 0 || !currentPoint) return null

    const allPoints = [...points.map(p => new THREE.Vector3(...p)), currentPoint]
    const config = SURFACE_TOOL_CONFIG[activeType] || SURFACE_TOOL_CONFIG[SURFACE_TOOL_DEFAULT_TYPE]

    if (config.isPath) {
      if (isCurved && allPoints.length > 1) {
        const curve = new THREE.CatmullRomCurve3(
          allPoints,
          false,
          SURFACE_TOOL_CURVE_TYPE,
          0.5
        )
        return {
          type: SurfaceGeometryKind.Curve,
          path: curve,
          width: config.width || 1,
          color: config.color,
        }
      }

      return {
        type: SurfaceGeometryKind.Line,
        points: allPoints,
        width: config.width || 1,
        color: config.color,
      }
    }

    const shape = new THREE.Shape()
    shape.moveTo(allPoints[0].x, allPoints[0].z)

    if (isCurved && allPoints.length > 2) {
      for (let i = 1; i < allPoints.length; i++) shape.lineTo(allPoints[i].x, allPoints[i].z)
    } else {
      for (let i = 1; i < allPoints.length; i++) shape.lineTo(allPoints[i].x, allPoints[i].z)
    }
    shape.lineTo(allPoints[0].x, allPoints[0].z)

    return { type: SurfaceGeometryKind.Shape, shape, color: config.color }
  }, [points, currentPoint, activeType, isCurved, mode])

  if (mode !== INTERACTION_MODE_SURFACE) return null

  return (
    <group position={[0, activeLevel * 3, 0]}>
      <mesh
        rotation={[-Math.PI / 2, 0, 0]}
        position={[0, 0.02, 0]}
        visible={false}
        onPointerMove={handlePointerMove}
        onPointerDown={handlePointerDown}
        onContextMenu={handleContextMenu}
      >
        <planeGeometry args={[1000, 1000]} />
      </mesh>

      {currentPoint && (
        <mesh position={currentPoint}>
          <sphereGeometry args={[0.3]} />
          <meshBasicMaterial
            color={SURFACE_TOOL_CONFIG[activeType].color}
            opacity={0.5}
            transparent
          />
        </mesh>
      )}

      {points.map((p, i) => (
        <mesh key={i} position={new THREE.Vector3(...p)}>
          <sphereGeometry args={[0.2]} />
          <meshBasicMaterial color={SurfaceMaterialColor.White} />
        </mesh>
      ))}

      {previewGeometry && (
        <>
          {previewGeometry.type === SurfaceGeometryKind.Shape && (
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

          {previewGeometry.type === SurfaceGeometryKind.Line && (
            <Line
              points={previewGeometry.points}
              color={previewGeometry.color}
              lineWidth={2}
              dashed
            />
          )}

          {previewGeometry.type === SurfaceGeometryKind.Curve && (
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
    </group>
  )
}
