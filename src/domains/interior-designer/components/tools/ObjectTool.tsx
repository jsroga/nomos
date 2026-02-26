/* eslint-disable react/no-unknown-property */
'use client'

import React, { useState } from 'react'
import { useInteriorStore } from '@/domains/interior-designer/store/useInteriorStore'
import { useThree, ThreeEvent } from '@react-three/fiber'
import * as THREE from 'three'

export const ObjectTool: React.FC = () => {
  const mode = useInteriorStore(state => state.mode)
  const addObject = useInteriorStore(state => state.addObject)
  const activeModelUrl = useInteriorStore(state => state.activeModelUrl)
  const activeLevel = useInteriorStore(state => state.activeLevel)
  const { raycaster, pointer, camera, scene } = useThree()

  const [currentPoint, setCurrentPoint] = useState<THREE.Vector3 | null>(null)
  const [currentRotation, setCurrentRotation] = useState<[number, number, number]>([0, 0, 0])
  const [isPlacable, setIsPlacable] = useState<boolean>(true)

  // Only active in OBJECT mode
  if (mode !== 'OBJECT') return null

  const getIntersection = () => {
    raycaster.setFromCamera(pointer, camera)

    const isWindowOrDoor = activeModelUrl === 'window' || activeModelUrl === 'door'

    // First, try to intersect with the scene (surfaces, etc)
    const intersects = raycaster.intersectObjects(scene.children, true)

    if (isWindowOrDoor) {
      // Filter hits to only walls
      const wallHit = intersects.find(hit => {
        return hit.object.type === 'Mesh' && hit.object.visible && hit.object.userData?.type === 'wall'
      })

      if (wallHit) {
        // Extract wall data
        const { start, end, thickness, height } = wallHit.object.userData
        const dx = end[0] - start[0]
        const dz = end[2] - start[2]

        // Match WallManager.tsx calculation exactly
        const wallAngle = Math.atan2(dz, dx)

        // Windows generally sit inside the wall, so snap to the raycast hit point
        // but perhaps center it vertically based on activeLevel or just use hit Y.
        // Let's strictly place it at Y=0 relative to the group for now or specific wall height.
        let y = 0
        if (activeModelUrl === 'window') {
          // Constrain window vertically to the center of the wall
          y = height / 2
        }

        // Return exact point on the wall bounding box, rotation matches wall rotation.
        // WallMesh has `rotation={[0, -angle, 0]}` where `angle = Math.atan2(dz, dx)`.
        const rotationY = -wallAngle

        return {
          point: new THREE.Vector3(wallHit.point.x, y, wallHit.point.z),
          rotation: [0, rotationY, 0] as [number, number, number],
          placable: true
        }
      } else {
        // No wall hit
        const plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0)
        const target = new THREE.Vector3()
        raycaster.ray.intersectPlane(plane, target)

        if (target) {
          return {
            point: target,
            rotation: [0, 0, 0] as [number, number, number],
            placable: false
          }
        }
      }
      return null
    }

    // Default object placement logic
    const groundHit = intersects.find(hit => {
      // Prioritize surfaces, ignore ghosts
      return hit.object.type === 'Mesh' && hit.object.visible && hit.object.userData?.type !== 'wall'
    })

    if (groundHit) {
      const x = Math.round(groundHit.point.x * 2) / 2
      const z = Math.round(groundHit.point.z * 2) / 2
      const y = 0
      return { point: new THREE.Vector3(x, y, z), rotation: [0, 0, 0] as [number, number, number], placable: true }
    }

    const plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0)
    const target = new THREE.Vector3()
    raycaster.ray.intersectPlane(plane, target)

    if (target) {
      target.x = Math.round(target.x * 2) / 2
      target.z = Math.round(target.z * 2) / 2
      target.y = 0
      return { point: target, rotation: [0, 0, 0] as [number, number, number], placable: true }
    }
    return null
  }

  const handlePointerMove = () => {
    const intersection = getIntersection()
    if (intersection) {
      setCurrentPoint(intersection.point)
      setCurrentRotation(intersection.rotation)
      setIsPlacable(intersection.placable)
    }
  }

  const handlePointerDown = (e: ThreeEvent<PointerEvent>) => {
    const intersection = getIntersection()
    if (!intersection) return

    if (!intersection.placable) return

    addObject({
      modelUrl: activeModelUrl,
      position: [intersection.point.x, intersection.point.y, intersection.point.z],
      rotation: intersection.rotation,
      scale: [1, 1, 1],
      level: activeLevel,
    })
  }

  const ghostColor = isPlacable ? '#f59e0b' : '#ef4444'

  return (
    <group position={[0, activeLevel * 3, 0]}>
      {/* Preview Ghost Object */}
      {currentPoint && (
        <group position={currentPoint} rotation={currentRotation} raycast={() => null}>
          {activeModelUrl === 'window' && (
            <mesh position={[0, 0, 0]}>
              <boxGeometry args={[1, 1.2, 0.1]} />
              <meshStandardMaterial color={ghostColor} transparent opacity={0.5} />
            </mesh>
          )}
          {activeModelUrl === 'door' && (
            <mesh position={[0, 1.05, 0]}>
              <boxGeometry args={[0.9, 2.1, 0.05]} />
              <meshStandardMaterial color={ghostColor} transparent opacity={0.5} />
            </mesh>
          )}
          {activeModelUrl === 'cube' && (
            <mesh position={[0, 0.5, 0]}>
              <boxGeometry args={[1, 1, 1]} />
              <meshStandardMaterial color={ghostColor} transparent opacity={0.5} />
            </mesh>
          )}
          {activeModelUrl === 'sphere' && (
            <mesh position={[0, 0.5, 0]}>
              <sphereGeometry args={[0.5]} />
              <meshStandardMaterial color={ghostColor} transparent opacity={0.5} />
            </mesh>
          )}
          {activeModelUrl === 'cylinder' && (
            <mesh position={[0, 0.5, 0]}>
              <cylinderGeometry args={[0.5, 0.5, 1]} />
              <meshStandardMaterial color={ghostColor} transparent opacity={0.5} />
            </mesh>
          )}
          {activeModelUrl === 'cone' && (
            <mesh position={[0, 0.5, 0]}>
              <coneGeometry args={[0.5, 1]} />
              <meshStandardMaterial color={ghostColor} transparent opacity={0.5} />
            </mesh>
          )}
        </group>
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
    </group>
  )
}
