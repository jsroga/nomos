/* eslint-disable react/no-unknown-property */
'use client'

import React, { useState } from 'react'
import { useInteriorStore } from '@/domains/interior-designer/store/useInteriorStore'
import { useThree, ThreeEvent } from '@react-three/fiber'
import * as THREE from 'three'
import { Box } from '@react-three/drei'

export const ObjectTool: React.FC = () => {
  const mode = useInteriorStore(state => state.mode)
  const addObject = useInteriorStore(state => state.addObject)
  const activeModelUrl = useInteriorStore(state => state.activeModelUrl)
  const activeLevel = useInteriorStore(state => state.activeLevel)
  const { raycaster, pointer, camera, scene } = useThree()

  const [currentPoint, setCurrentPoint] = useState<THREE.Vector3 | null>(null)

  // Only active in OBJECT mode
  if (mode !== 'OBJECT') return null

  const getIntersection = () => {
    raycaster.setFromCamera(pointer, camera)

    // First, try to intersect with the scene (surfaces, etc)
    // Filter for objects that are strictly surfaces or ground-like
    // Using a broad check for now, can refine if needed
    const intersects = raycaster.intersectObjects(scene.children, true)

    // Find the first intersection that is visible and NOT the ghost object or cursor helpers
    // We can assume surfaces are meshes.
    const groundHit = intersects.find(hit => {
      // Simple heuristic: ignore if it's the ghost object (which might be in the scene?)
      // Our ghost object is inside <group> in this component.
      // It's safer to rely on the fact that the ghost is likely transparent or transient?
      // Actually, raycaster can hit the ghost if we aren't careful.
      // But since the Ghost is in THIS component, and this component is a child of the scene...
      // We probably get self-intersection.
      // We can ignore objects with specific userData or just checking distance?

      // Let's filter out non-surface type objects if possible.
      // Or better: Prioritize surfaces.
      return hit.object.type === 'Mesh' && hit.object.visible
    })

    if (groundHit) {
      // Snap logic for objects (optional grid snap)
      const x = Math.round(groundHit.point.x * 2) / 2
      const z = Math.round(groundHit.point.z * 2) / 2
      const y = groundHit.point.y

      // Determine offset based on object type
      let yOffset = 0
      if (['cube', 'cylinder', 'sphere'].includes(activeModelUrl)) {
        yOffset = 0.5
      }

      return new THREE.Vector3(x, y + yOffset, z)
    }

    // Fallback plane intersection
    const plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), -activeLevel * 3)
    const target = new THREE.Vector3()
    raycaster.ray.intersectPlane(plane, target)

    if (target) {
      target.x = Math.round(target.x * 2) / 2
      target.z = Math.round(target.z * 2) / 2
      target.y = 0.5 // Default half height
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

  const handlePointerDown = (e: ThreeEvent<PointerEvent>) => {
    const point = getIntersection()
    if (!point) return

    addObject({
      modelUrl: activeModelUrl,
      position: [point.x, point.y, point.z],
      rotation: [0, 0, 0],
      scale: [1, 1, 1],
    })
  }

  return (
    <group position={[0, activeLevel * 3, 0]}>
      {/* Preview Ghost Object */}
      {currentPoint && (
        <group position={currentPoint}>
          {activeModelUrl === 'cube' && (
            <Box args={[1, 1, 1]}>
              <meshStandardMaterial color="#f59e0b" transparent opacity={0.5} />
            </Box>
          )}
          {activeModelUrl === 'sphere' && (
            <mesh>
              <sphereGeometry args={[0.5]} />
              <meshStandardMaterial color="#f59e0b" transparent opacity={0.5} />
            </mesh>
          )}
          {activeModelUrl === 'cylinder' && (
            <mesh>
              <cylinderGeometry args={[0.5, 0.5, 1]} />
              <meshStandardMaterial color="#f59e0b" transparent opacity={0.5} />
            </mesh>
          )}
          {activeModelUrl === 'cone' && (
            <mesh>
              <coneGeometry args={[0.5, 1]} />
              <meshStandardMaterial color="#f59e0b" transparent opacity={0.5} />
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
