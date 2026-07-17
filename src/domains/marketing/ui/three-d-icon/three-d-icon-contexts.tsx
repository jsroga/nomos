'use client'

import React, { useRef, useContext } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'

export const ScaleContext = React.createContext(1)

export const MousePositionContext = React.createContext<React.RefObject<{ x: number; y: number }> | null>(
  null
)

export function MouseRotationGroup({
  children,
  intensity = 0,
}: {
  children: React.ReactNode
  intensity?: number
}) {
  const groupRef = useRef<THREE.Group>(null)
  const mouseRef = useContext(MousePositionContext)
  const currentRotation = useRef({ x: 0, y: 0 })

  useFrame(() => {
    if (!intensity || !groupRef.current || !mouseRef?.current) return
    const targetX = -mouseRef.current.y * intensity
    const targetY = mouseRef.current.x * intensity
    currentRotation.current.x += (targetX - currentRotation.current.x) * 0.05
    currentRotation.current.y += (targetY - currentRotation.current.y) * 0.05
    groupRef.current.rotation.x = currentRotation.current.x
    groupRef.current.rotation.y = currentRotation.current.y
  })

  return <group ref={groupRef}>{children}</group>
}
