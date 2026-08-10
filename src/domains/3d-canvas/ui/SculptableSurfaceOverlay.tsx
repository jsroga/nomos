import React, { useRef } from 'react'
import * as THREE from 'three'
import { useFrame } from '@react-three/fiber'
import type { SurfaceRenderConfig } from '@/domains/3d-canvas/constants/surface-render-config'

export const SculptableSurfaceOverlay: React.FC<{
  bounds: { minX: number; maxX: number; minZ: number; maxZ: number } | null
  config: SurfaceRenderConfig
}> = ({ bounds, config }) => {
  const meshRef = useRef<THREE.Mesh>(null)
  const materialRef = useRef<THREE.MeshBasicMaterial>(null)

  useFrame(state => {
    if (materialRef.current) {
      const pulse = 0.35 + Math.sin(state.clock.elapsedTime * 3) * 0.15
      materialRef.current.opacity = pulse
    }
  })

  if (!bounds) {
    return null
  }

  const width = bounds.maxX - bounds.minX
  const depth = bounds.maxZ - bounds.minZ
  const centerX = (bounds.minX + bounds.maxX) / 2
  const centerZ = (bounds.minZ + bounds.maxZ) / 2

  return (
    <mesh
      ref={meshRef}
      position={[centerX, (config.verticalOffset || 0) + 0.5, centerZ]}
      rotation={[-Math.PI / 2, 0, 0]}
    >
      <planeGeometry args={[width, depth]} />
      <meshBasicMaterial
        ref={materialRef}
        color="#3b82f6"
        transparent
        opacity={0.35}
        side={THREE.DoubleSide}
        depthWrite={false}
      />
    </mesh>
  )
}
