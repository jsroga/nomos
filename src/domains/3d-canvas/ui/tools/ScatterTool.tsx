/* eslint-disable react/no-unknown-property */
'use client'

import React, { useState, useRef } from 'react'
import { INTERACTION_MODE_SCATTER } from '@/domains/3d-canvas/constants/interaction-modes'
import { useInteriorStore } from '@/domains/3d-canvas'
import { useThree, useFrame } from '@react-three/fiber'
import * as THREE from 'three'

export const ScatterTool: React.FC = () => {
  const mode = useInteriorStore(state => state.mode)
  const addObject = useInteriorStore(state => state.addObject)
  const activeLevel = useInteriorStore(state => state.activeLevel)
  const activeModelUrl = useInteriorStore(state => state.activeModelUrl)
  const { raycaster, pointer, camera } = useThree()

  const [isDrawing, setIsDrawing] = useState(false)
  const [cursorPos, setCursorPos] = useState<THREE.Vector3 | null>(null)

  // Only active in SCATTER mode
  if (mode !== INTERACTION_MODE_SCATTER) return null

  const getIntersection = () => {
    raycaster.setFromCamera(pointer, camera)
    const plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), -activeLevel * 3)
    const target = new THREE.Vector3()
    raycaster.ray.intersectPlane(plane, target)
    return target
  }

  const handlePointerMove = () => {
    const point = getIntersection()
    if (point) {
      setCursorPos(point)
    }
  }

  const spawnObject = (center: THREE.Vector3) => {
    const radius = 1.5
    const angle = Math.random() * Math.PI * 2
    const distance = Math.sqrt(Math.random()) * radius

    const x = center.x + Math.cos(angle) * distance
    const z = center.z + Math.sin(angle) * distance

    // Randomize scale slightly
    const scale = 0.3 + Math.random() * 0.4

    addObject({
      modelUrl: activeModelUrl,
      position: [x, 0, z], // Always Y=0 - objects must be snapped to bottom of level
      rotation: [0, Math.random() * Math.PI * 2, 0],
      scale: [scale, scale, scale],
    })
  }

  const handlePointerDown = () => {
    setIsDrawing(true)
    const point = getIntersection()
    if (point) {
      spawnObject(point)
    }
  }

  const handlePointerUp = () => {
    setIsDrawing(false)
  }

  // Use useFrame for continuous spawning while dragging
  // But we need to attach this logic to the scene or a global handler,
  // because onPointerMove on the plane only fires when moving.
  // If we hold still, we might want to keep spawning? Or only on move?
  // "Scatter" usually implies moving the brush.
  // Let's stick to event-based for now or check isDrawing in useFrame.

  // Actually, let's use useFrame to spawn if isDrawing is true and we have moved enough or time passed
  // But we need current pointer position.

  // Let's just spawn on pointer move if drawing?
  // Or simpler: just click to scatter a bunch at once?
  // Let's do "Spray Can" style: hold to spawn.

  return (
    <group position={[0, activeLevel * 3, 0]}>
      <BrushLogic isDrawing={isDrawing} cursorPos={cursorPos} onSpawn={spawnObject} />

      {/* Cursor Visual */}
      {cursorPos && (
        <group position={cursorPos}>
          <mesh rotation={[-Math.PI / 2, 0, 0]}>
            <ringGeometry args={[1.4, 1.5, 32]} />
            <meshBasicMaterial color="#ec4899" transparent opacity={0.5} />
          </mesh>
        </group>
      )}

      {/* Interaction Plane */}
      <mesh
        rotation={[-Math.PI / 2, 0, 0]}
        position={[0, -0.01, 0]}
        visible={false}
        onPointerMove={handlePointerMove}
        onPointerDown={handlePointerDown}
        onPointerUp={handlePointerUp}
        onPointerLeave={handlePointerUp}
      >
        <planeGeometry args={[1000, 1000]} />
      </mesh>
    </group>
  )
}

const BrushLogic: React.FC<{
  isDrawing: boolean
  cursorPos: THREE.Vector3 | null
  onSpawn: (pos: THREE.Vector3) => void
}> = ({ isDrawing, cursorPos, onSpawn }) => {
  const lastTime = useRef(0)

  useFrame(state => {
    if (!isDrawing || !cursorPos) return

    const now = state.clock.getElapsedTime()
    if (now - lastTime.current > 0.1) {
      // Spawn every 100ms
      onSpawn(cursorPos)
      lastTime.current = now
    }
  })

  return null
}
