/* eslint-disable react/no-unknown-property */
'use client'

import React, { useState, useMemo } from 'react'
import { useInteriorStore } from '@/domains/interior-designer/store/useInteriorStore'
import { useThree, ThreeEvent } from '@react-three/fiber'
import * as THREE from 'three'

export const WaterTool: React.FC = () => {
  const mode = useInteriorStore(state => state.mode)
  const addWater = useInteriorStore(state => state.addWater)
  const activeLevel = useInteriorStore(state => state.activeLevel)
  const { raycaster, pointer, camera } = useThree()

  const [points, setPoints] = useState<[number, number, number][]>([])
  const [currentPoint, setCurrentPoint] = useState<THREE.Vector3 | null>(null)

  // Only active in WATER mode
  if (mode !== 'WATER') return null

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

    // Check if we are closing the loop
    if (points.length > 2) {
      const start = new THREE.Vector3(...points[0])
      if (start.distanceTo(point) < 0.5) {
        // Close loop
        addWater({
          points: points,
          y: -0.1, // Slightly lowered for water effect
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
    shape.moveTo(points[0][0], points[0][2])

    for (let i = 1; i < points.length; i++) {
      shape.lineTo(points[i][0], points[i][2])
    }

    shape.lineTo(currentPoint.x, currentPoint.z)
    shape.lineTo(points[0][0], points[0][2])

    return shape
  }, [points, currentPoint])

  return (
    <group position={[0, activeLevel * 3, 0]}>
      {/* Filled Polygon Preview for Water */}
      {previewShape && points.length > 0 && (
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.05, 0]}>
          <shapeGeometry args={[previewShape]} />
          <meshBasicMaterial color="#06b6d4" transparent opacity={0.5} side={THREE.DoubleSide} />
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
                  ...(currentPoint && points.length > 0
                    ? [points[0][0], points[0][1] + 0.1, points[0][2]]
                    : []),
                ])
              }
              itemSize={3}
            />
          </bufferGeometry>
          <lineBasicMaterial color="#0891b2" linewidth={2} />
        </line>
      )}

      {/* Start Point Indicator */}
      {points.length > 0 && (
        <mesh position={new THREE.Vector3(...points[0])}>
          <sphereGeometry args={[0.3]} />
          <meshBasicMaterial color={points.length > 2 ? '#22c55e' : '#0891b2'} />
        </mesh>
      )}

      {/* Existing Points */}
      {points.slice(1).map((p, i) => (
        <mesh key={i} position={new THREE.Vector3(...p)}>
          <sphereGeometry args={[0.1]} />
          <meshBasicMaterial color="#0891b2" />
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
          <meshBasicMaterial color="#06b6d4" />
        </mesh>
      )}
    </group>
  )
}
