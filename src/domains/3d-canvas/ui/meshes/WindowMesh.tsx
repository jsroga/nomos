/* eslint-disable react/no-unknown-property */
'use client'

import {
  DEFAULT_FRAME_COLOR,
  WINDOW_GLASS_COLOR,
} from '@/domains/3d-canvas/constants/mesh-colors'
import React, { useMemo } from 'react'
import * as THREE from 'three'

interface WindowMeshProps {
  color?: string
  isSelected?: boolean
  opacity?: number
}

/**
 * Simple 3D window frame geometry for fast prototyping
 * Default dimensions: 1m × 1.2m × 0.1m
 */
export const WindowMesh: React.FC<WindowMeshProps> = ({
  color = DEFAULT_FRAME_COLOR, // Warm brownish-gray, close to wall color
  isSelected = false,
  opacity = 1,
}) => {
  const frameColor = useMemo(() => new THREE.Color(color), [color])
  const glassColor = useMemo(() => new THREE.Color(WINDOW_GLASS_COLOR), [])

  // Window dimensions
  const width = 1
  const height = 1.2
  const depth = 0.1
  const frameThickness = 0.08

  return (
    <group>
      {/* Outer Frame - Top */}
      <mesh position={[0, height / 2 - frameThickness / 2, 0]} castShadow>
        <boxGeometry args={[width, frameThickness, depth]} />
        <meshStandardMaterial
          color={frameColor}
          roughness={0.8}
          metalness={0.1}
          opacity={opacity}
          transparent={opacity < 1}
        />
      </mesh>

      {/* Outer Frame - Bottom */}
      <mesh position={[0, -height / 2 + frameThickness / 2, 0]} castShadow>
        <boxGeometry args={[width, frameThickness, depth]} />
        <meshStandardMaterial
          color={frameColor}
          roughness={0.8}
          metalness={0.1}
          opacity={opacity}
          transparent={opacity < 1}
        />
      </mesh>

      {/* Outer Frame - Left */}
      <mesh position={[-width / 2 + frameThickness / 2, 0, 0]} castShadow>
        <boxGeometry args={[frameThickness, height - frameThickness * 2, depth]} />
        <meshStandardMaterial
          color={frameColor}
          roughness={0.8}
          metalness={0.1}
          opacity={opacity}
          transparent={opacity < 1}
        />
      </mesh>

      {/* Outer Frame - Right */}
      <mesh position={[width / 2 - frameThickness / 2, 0, 0]} castShadow>
        <boxGeometry args={[frameThickness, height - frameThickness * 2, depth]} />
        <meshStandardMaterial
          color={frameColor}
          roughness={0.8}
          metalness={0.1}
          opacity={opacity}
          transparent={opacity < 1}
        />
      </mesh>

      {/* Center Cross - Horizontal */}
      <mesh position={[0, 0, 0]} castShadow>
        <boxGeometry args={[width - frameThickness * 2, frameThickness * 0.5, depth * 0.5]} />
        <meshStandardMaterial
          color={frameColor}
          roughness={0.8}
          metalness={0.1}
          opacity={opacity}
          transparent={opacity < 1}
        />
      </mesh>

      {/* Center Cross - Vertical */}
      <mesh position={[0, 0, 0]} castShadow>
        <boxGeometry args={[frameThickness * 0.5, height - frameThickness * 2, depth * 0.5]} />
        <meshStandardMaterial
          color={frameColor}
          roughness={0.8}
          metalness={0.1}
          opacity={opacity}
          transparent={opacity < 1}
        />
      </mesh>

      {/* Glass Pane */}
      <mesh position={[0, 0, 0]}>
        <planeGeometry args={[width - frameThickness * 2, height - frameThickness * 2]} />
        <meshStandardMaterial
          color={glassColor}
          transparent
          opacity={0.3}
          roughness={0.1}
          metalness={0.9}
          side={THREE.DoubleSide}
        />
      </mesh>

      {/* Selection highlight */}
      {isSelected && (
        <mesh>
          <boxGeometry args={[width + 0.05, height + 0.05, depth + 0.05]} />
          <meshBasicMaterial color="#4f46e5" wireframe transparent opacity={0.5} />
        </mesh>
      )}
    </group>
  )
}
