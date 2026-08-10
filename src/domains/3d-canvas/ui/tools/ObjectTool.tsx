/* eslint-disable react/no-unknown-property */
'use client'

import React, { useState } from 'react'
import { useInteriorStore } from '@/domains/3d-canvas'
import { InteriorObjectModel, INTERACTION_MODE_OBJECT } from '@/domains/3d-canvas/constants/interaction-modes'
import {
  OBJECT_GHOST_BLOCKED_COLOR,
  OBJECT_GHOST_PLACABLE_COLOR,
} from '@/domains/3d-canvas/constants/mesh-colors'
import {
  SceneUserDataType,
  THREE_MESH_OBJECT_TYPE,
} from '@/domains/3d-canvas/constants/three-js'
import { vec3 } from '@/domains/3d-canvas/core/vec3'
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

  if (mode !== INTERACTION_MODE_OBJECT) return null

  const getIntersection = () => {
    raycaster.setFromCamera(pointer, camera)

    const isWindowOrDoor =
      activeModelUrl === InteriorObjectModel.Window || activeModelUrl === InteriorObjectModel.Door

    // First, try to intersect with the scene (surfaces, etc)
    const intersects = raycaster.intersectObjects(scene.children, true)

    if (isWindowOrDoor) {
      // Filter hits to only walls
      const wallHit = intersects.find(hit => {
        return hit.object.type === THREE_MESH_OBJECT_TYPE && hit.object.visible && hit.object.userData?.type === SceneUserDataType.Wall
      })

      if (wallHit) {
        // Extract wall data
        const { start, end, height } = wallHit.object.userData
        const dx = end[0] - start[0]
        const dz = end[2] - start[2]

        // Match WallManager.tsx calculation exactly
        const wallAngle = Math.atan2(dz, dx)

        // Windows generally sit inside the wall, so snap to the raycast hit point
        // but perhaps center it vertically based on activeLevel or just use hit Y.
        // Let's strictly place it at Y=0 relative to the group for now or specific wall height.
        let y = 0
        if (activeModelUrl === InteriorObjectModel.Window) {
          // Constrain window vertically to the center of the wall
          y = height / 2
        }

        // Return exact point on the wall bounding box, rotation matches wall rotation.
        // WallMesh has `rotation={[0, -angle, 0]}` where `angle = Math.atan2(dz, dx)`.
        const rotationY = -wallAngle

        return {
          point: new THREE.Vector3(wallHit.point.x, y, wallHit.point.z),
          rotation: vec3(0, rotationY, 0),
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
            rotation: vec3(0, 0, 0),
            placable: false
          }
        }
      }
      return null
    }

    // Default object placement logic
    const groundHit = intersects.find(hit => {
      // Prioritize surfaces, ignore ghosts
      return hit.object.type === THREE_MESH_OBJECT_TYPE && hit.object.visible && hit.object.userData?.type !== SceneUserDataType.Wall
    })

    if (groundHit) {
      const x = Math.round(groundHit.point.x * 2) / 2
      const z = Math.round(groundHit.point.z * 2) / 2
      const y = 0
      return { point: new THREE.Vector3(x, y, z), rotation: vec3(0, 0, 0), placable: true }
    }

    const plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0)
    const target = new THREE.Vector3()
    raycaster.ray.intersectPlane(plane, target)

    if (target) {
      target.x = Math.round(target.x * 2) / 2
      target.z = Math.round(target.z * 2) / 2
      target.y = 0
      return { point: target, rotation: vec3(0, 0, 0), placable: true }
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

  const handlePointerDown = (_e: ThreeEvent<PointerEvent>) => {
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

  const ghostColor = isPlacable ? OBJECT_GHOST_PLACABLE_COLOR : OBJECT_GHOST_BLOCKED_COLOR

  return (
    <group position={[0, activeLevel * 3, 0]}>
      {/* Preview Ghost Object */}
      {currentPoint && (
        <group position={currentPoint} rotation={currentRotation} raycast={() => null}>
          {activeModelUrl === InteriorObjectModel.Window && (
            <mesh position={[0, 0, 0]}>
              <boxGeometry args={[1, 1.2, 0.1]} />
              <meshStandardMaterial color={ghostColor} transparent opacity={0.5} />
            </mesh>
          )}
          {activeModelUrl === InteriorObjectModel.Door && (
            <mesh position={[0, 1.05, 0]}>
              <boxGeometry args={[0.9, 2.1, 0.05]} />
              <meshStandardMaterial color={ghostColor} transparent opacity={0.5} />
            </mesh>
          )}
          {activeModelUrl === InteriorObjectModel.Cube && (
            <mesh position={[0, 0.5, 0]}>
              <boxGeometry args={[1, 1, 1]} />
              <meshStandardMaterial color={ghostColor} transparent opacity={0.5} />
            </mesh>
          )}
          {activeModelUrl === InteriorObjectModel.Sphere && (
            <mesh position={[0, 0.5, 0]}>
              <sphereGeometry args={[0.5]} />
              <meshStandardMaterial color={ghostColor} transparent opacity={0.5} />
            </mesh>
          )}
          {activeModelUrl === InteriorObjectModel.Cylinder && (
            <mesh position={[0, 0.5, 0]}>
              <cylinderGeometry args={[0.5, 0.5, 1]} />
              <meshStandardMaterial color={ghostColor} transparent opacity={0.5} />
            </mesh>
          )}
          {activeModelUrl === InteriorObjectModel.Cone && (
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
