/* eslint-disable react/no-unknown-property */
'use client'

import React, { useRef, useState } from 'react'
import { INTERACTION_MODE_SCATTER } from '@/domains/3d-canvas/constants/interaction-modes'
import { ScatterSpawnIntervalMs } from '@/domains/3d-canvas/constants/render-quality'
import { useInteriorStore } from '@/domains/3d-canvas'
import { useThree, useFrame } from '@react-three/fiber'
import * as THREE from 'three'

export const ScatterTool: React.FC = () => {
  const mode = useInteriorStore(state => state.mode)
  const addObject = useInteriorStore(state => state.addObject)
  const activeLevel = useInteriorStore(state => state.activeLevel)
  const activeModelUrl = useInteriorStore(state => state.activeModelUrl)
  const setInteractionActive = useInteriorStore(state => state.setInteractionActive)
  const { raycaster, pointer, camera } = useThree()

  const [isDrawing, setIsDrawing] = useState(false)
  const cursorPosRef = useRef<THREE.Vector3 | null>(null)
  const [cursorVisual, setCursorVisual] = useState<THREE.Vector3 | null>(null)

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
      cursorPosRef.current = point
      setCursorVisual(point.clone())
    }
  }

  const spawnObject = (center: THREE.Vector3) => {
    const radius = 1.5
    const angle = Math.random() * Math.PI * 2
    const distance = Math.sqrt(Math.random()) * radius

    const x = center.x + Math.cos(angle) * distance
    const z = center.z + Math.sin(angle) * distance
    const scale = 0.3 + Math.random() * 0.4

    addObject({
      modelUrl: activeModelUrl,
      position: [x, 0, z],
      rotation: [0, Math.random() * Math.PI * 2, 0],
      scale: [scale, scale, scale],
    })
  }

  const handlePointerDown = () => {
    setInteractionActive(true)
    setIsDrawing(true)
    const point = getIntersection()
    if (point) {
      cursorPosRef.current = point
      spawnObject(point)
    }
  }

  const handlePointerUp = () => {
    setIsDrawing(false)
    setInteractionActive(false)
  }

  if (mode !== INTERACTION_MODE_SCATTER) return null

  return (
    <group position={[0, activeLevel * 3, 0]}>
      <BrushLogic isDrawing={isDrawing} cursorPosRef={cursorPosRef} onSpawn={spawnObject} />

      {cursorVisual && (
        <group position={cursorVisual}>
          <mesh rotation={[-Math.PI / 2, 0, 0]}>
            <ringGeometry args={[1.4, 1.5, 32]} />
            <meshBasicMaterial color="#ec4899" transparent opacity={0.5} />
          </mesh>
        </group>
      )}

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
  cursorPosRef: React.MutableRefObject<THREE.Vector3 | null>
  onSpawn: (pos: THREE.Vector3) => void
}> = ({ isDrawing, cursorPosRef, onSpawn }) => {
  const lastTime = useRef(0)
  const pendingSpawns = useRef<THREE.Vector3[]>([])

  useFrame(state => {
    if (!isDrawing) {
      if (pendingSpawns.current.length > 0) {
        for (const pos of pendingSpawns.current) {
          onSpawn(pos)
        }
        pendingSpawns.current = []
      }
      return
    }

    const cursor = cursorPosRef.current
    if (!cursor) return

    const now = state.clock.getElapsedTime()
    if (now - lastTime.current < ScatterSpawnIntervalMs.Min / 1000) return

    pendingSpawns.current.push(cursor.clone())
    lastTime.current = now

    // Flush up to 2 queued spawns per frame to avoid store thrash.
    const batch = pendingSpawns.current.splice(0, 2)
    for (const pos of batch) {
      onSpawn(pos)
    }
  })

  return null
}
