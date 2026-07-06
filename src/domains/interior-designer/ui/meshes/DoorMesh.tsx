/* eslint-disable react/no-unknown-property */
'use client'

import React, { useMemo } from 'react'
import * as THREE from 'three'

interface DoorMeshProps {
  color?: string
  isSelected?: boolean
  opacity?: number
}

/**
 * Simple 3D door panel geometry for fast prototyping
 * Default dimensions: 0.9m × 2.1m × 0.05m
 */
export const DoorMesh: React.FC<DoorMeshProps> = ({
  color = '#7a6f5e', // Warm brownish-gray, close to wall color
  isSelected = false,
  opacity = 1,
}) => {
  const doorColor = useMemo(() => new THREE.Color(color), [color])
  const handleColor = useMemo(() => new THREE.Color('#C0C0C0'), [])

  // Door dimensions
  const width = 0.9
  const height = 2.1
  const depth = 0.05

  return (
    <group>
      <group position={[0, height / 2, 0]}>
        {/* Main Door Panel */}
        <mesh position={[0, 0, 0]} castShadow receiveShadow>
          <boxGeometry args={[width, height, depth]} />
          <meshStandardMaterial
            color={doorColor}
            roughness={0.7}
            metalness={0.1}
            opacity={opacity}
            transparent={opacity < 1}
          />
        </mesh>

        {/* Door Frame - Top */}
        <mesh position={[0, height / 2 + 0.03, 0]} castShadow>
          <boxGeometry args={[width + 0.1, 0.06, depth + 0.02]} />
          <meshStandardMaterial
            color={doorColor}
            roughness={0.8}
            metalness={0.1}
            opacity={opacity}
            transparent={opacity < 1}
          />
        </mesh>

        {/* Door Frame - Left */}
        <mesh position={[-width / 2 - 0.03, 0, 0]} castShadow>
          <boxGeometry args={[0.06, height, depth + 0.02]} />
          <meshStandardMaterial
            color={doorColor}
            roughness={0.8}
            metalness={0.1}
            opacity={opacity}
            transparent={opacity < 1}
          />
        </mesh>

        {/* Door Frame - Right */}
        <mesh position={[width / 2 + 0.03, 0, 0]} castShadow>
          <boxGeometry args={[0.06, height, depth + 0.02]} />
          <meshStandardMaterial
            color={doorColor}
            roughness={0.8}
            metalness={0.1}
            opacity={opacity}
            transparent={opacity < 1}
          />
        </mesh>

        {/* Upper Panel Inset */}
        <mesh position={[0, height / 4 + 0.1, depth / 2 + 0.005]}>
          <boxGeometry args={[width * 0.7, height * 0.35, 0.01]} />
          <meshStandardMaterial
            color={doorColor}
            roughness={0.6}
            metalness={0.15}
            opacity={opacity}
            transparent={opacity < 1}
          />
        </mesh>

        {/* Lower Panel Inset */}
        <mesh position={[0, -height / 4 - 0.1, depth / 2 + 0.005]}>
          <boxGeometry args={[width * 0.7, height * 0.35, 0.01]} />
          <meshStandardMaterial
            color={doorColor}
            roughness={0.6}
            metalness={0.15}
            opacity={opacity}
            transparent={opacity < 1}
          />
        </mesh>

        {/* Door Handle - Base Plate */}
        <mesh position={[width / 2 - 0.12, 0, depth / 2 + 0.015]} castShadow>
          <boxGeometry args={[0.03, 0.12, 0.015]} />
          <meshStandardMaterial
            color={handleColor}
            roughness={0.3}
            metalness={0.8}
            opacity={opacity}
            transparent={opacity < 1}
          />
        </mesh>

        {/* Door Handle - Lever */}
        <mesh position={[width / 2 - 0.12, 0, depth / 2 + 0.04]} castShadow>
          <cylinderGeometry args={[0.015, 0.015, 0.1, 16]} />
          <meshStandardMaterial
            color={handleColor}
            roughness={0.3}
            metalness={0.8}
            opacity={opacity}
            transparent={opacity < 1}
          />
        </mesh>

        {/* Door Handle - Knob */}
        <mesh position={[width / 2 - 0.17, 0, depth / 2 + 0.04]} castShadow>
          <sphereGeometry args={[0.02, 16, 16]} />
          <meshStandardMaterial
            color={handleColor}
            roughness={0.2}
            metalness={0.9}
            opacity={opacity}
            transparent={opacity < 1}
          />
        </mesh>

        {/* Selection highlight */}
        {isSelected && (
          <mesh>
            <boxGeometry args={[width + 0.15, height + 0.1, depth + 0.1]} />
            <meshBasicMaterial color="#4f46e5" wireframe transparent opacity={0.5} />
          </mesh>
        )}
      </group>
    </group>
  )
}
