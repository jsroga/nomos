/* eslint-disable react/no-unknown-property */
'use client'

import React, { useState, useMemo } from 'react'
import { useInteriorStore } from '@/domains/interior-designer/store/useInteriorStore'
import { useThree, ThreeEvent } from '@react-three/fiber'
import * as THREE from 'three'

export const FloorTool: React.FC = () => {
  const mode = useInteriorStore(state => state.mode)
  const addFloor = useInteriorStore(state => state.addFloor)
  const activeLevel = useInteriorStore(state => state.activeLevel)
  const { raycaster, pointer, camera } = useThree()

  const [points, setPoints] = useState<[number, number, number][]>([])
  const [currentPoint, setCurrentPoint] = useState<THREE.Vector3 | null>(null)

  // Only active in FLOOR mode
  if (mode !== 'FLOOR') return null

  const getIntersection = () => {
    raycaster.setFromCamera(pointer, camera)
    const plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), -activeLevel * 3)
    const target = new THREE.Vector3()
    raycaster.ray.intersectPlane(plane, target)

    if (target) {
      target.x = Math.round(target.x * 2) / 2
      target.z = Math.round(target.z * 2) / 2
      target.y = 0
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

    // Check if we are closing the loop (clicking near start point)
    if (points.length > 2) {
      const start = new THREE.Vector3(...points[0])
      if (start.distanceTo(point) < 0.5) {
        // Close loop
        addFloor({
          points: points,
          y: 0,
        })
        setPoints([])
        return
      }
    }

    setPoints([...points, [point.x, point.y, point.z]])
  }

  // Generate preview shape
  const previewShape = useMemo(() => {
    if (points.length === 0 || !currentPoint) return null

    const shape = new THREE.Shape()
    shape.moveTo(points[0][0], points[0][2]) // Use X and Z for 2D shape

    for (let i = 1; i < points.length; i++) {
      shape.lineTo(points[i][0], points[i][2])
    }

    // Connect to current cursor position
    shape.lineTo(currentPoint.x, currentPoint.z)

    // Close back to start (for visual completeness)
    shape.lineTo(points[0][0], points[0][2])

    return shape
  }, [points, currentPoint])

  return (
    <group position={[0, activeLevel * 3, 0]}>
      {/* Filled Polygon Preview */}
      {previewShape && points.length > 0 && (
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.05, 0]}>
          <shapeGeometry args={[previewShape]} />
          <meshBasicMaterial color="#4f46e5" transparent opacity={0.3} side={THREE.DoubleSide} />
        </mesh>
      )}

      {/* Preview Lines */}
      {points.length > 0 && (
        <line>
          <bufferGeometry>
            <float32BufferAttribute
              attach="attributes-position"
              count={points.length + (currentPoint ? 2 : 0)}
              array={
                new Float32Array([
                  ...points.flat(),
                  ...(currentPoint ? [currentPoint.x, currentPoint.y + 0.1, currentPoint.z] : []),
                  ...(currentPoint && points.length > 0 ? [points[0][0], points[0][1] + 0.1, points[0][2]] : []) // Line back to start
                ])
              }
              itemSize={3}
            />
          </bufferGeometry>
          <lineBasicMaterial color="#4f46e5" linewidth={2} />
        </line>
      )}

      {/* Start Point Indicator (to show where to click to close) */}
      {points.length > 0 && (
        <mesh position={new THREE.Vector3(...points[0])}>
          <sphereGeometry args={[0.3]} />
          <meshBasicMaterial color={points.length > 2 ? '#22c55e' : '#3b82f6'} />
        </mesh>
      )}

      {/* Existing Points Indicators */}
      {points.slice(1).map((p, i) => (
        <mesh key={i} position={new THREE.Vector3(...p)}>
          <sphereGeometry args={[0.1]} />
          <meshBasicMaterial color="#3b82f6" />
        </mesh>
      ))}

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

      {/* Cursor Indicator */}
      {currentPoint && (
        <mesh position={currentPoint}>
          <sphereGeometry args={[0.1]} />
          <meshBasicMaterial color="blue" />
        </mesh>
      )}
    </group>
  )
}
