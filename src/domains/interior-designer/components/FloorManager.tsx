'use client'

import React, { useMemo } from 'react'
import { useInteriorStore } from '@/domains/interior-designer/store/useInteriorStore'
import * as THREE from 'three'
import { useTexture } from '@react-three/drei'

import { Floor } from '@/domains/interior-designer/store/useInteriorStore'
import { ThreeEvent } from '@react-three/fiber'

const FloorMesh: React.FC<{
  floor: Floor
  isSelected: boolean
  onClick: (e: ThreeEvent<MouseEvent>) => void
  opacity?: number
}> = ({ floor, isSelected, onClick, opacity = 1 }) => {
  // Create shape from points
  // Note: Shape uses X,Y coordinates. We use X and -Z (negated) because
  // the mesh rotation of -PI/2 around X axis will negate Y->Z transformation
  const shape = useMemo(() => {
    console.log('FloorMesh - Creating shape from points:', floor.points)
    const s = new THREE.Shape()
    if (floor.points.length > 0) {
      // Use X and NEGATED Z for the shape (rotation will negate it back)
      console.log('FloorMesh - moveTo:', floor.points[0][0], -floor.points[0][2])
      s.moveTo(floor.points[0][0], -floor.points[0][2])
      for (let i = 1; i < floor.points.length; i++) {
        console.log('FloorMesh - lineTo:', floor.points[i][0], -floor.points[i][2])
        s.lineTo(floor.points[i][0], -floor.points[i][2])
      }
      s.closePath()
    }
    return s
  }, [floor.points])

  const textureUrl = floor.texture && floor.texture.startsWith('http') ? floor.texture : null
  const color = !textureUrl ? floor.texture || '#94a3b8' : '#ffffff'

  return (
    <mesh
      rotation={[-Math.PI / 2, 0, 0]}
      position={[0, floor.y + 0.01, 0]} // Slight offset to avoid z-fighting with grid
      onClick={onClick}
    >
      <shapeGeometry args={[shape]} />
      {textureUrl ? (
        <TexturedMaterial url={textureUrl} isSelected={isSelected} opacity={opacity} />
      ) : (
        <meshStandardMaterial
          color={isSelected ? '#4f46e5' : color}
          side={THREE.DoubleSide}
          transparent={opacity < 1}
          opacity={opacity}
        />
      )}
    </mesh>
  )
}

const TexturedMaterial: React.FC<{ url: string; isSelected: boolean; opacity?: number }> = ({
  url,
  isSelected,
  opacity = 1,
}) => {
  const loadedTexture = useTexture(url)

  // Clone texture to avoid mutating hook return value
  const texture = React.useMemo(() => {
    const cloned = loadedTexture.clone()
    cloned.wrapS = cloned.wrapT = THREE.RepeatWrapping
    cloned.repeat.set(0.5, 0.5)
    cloned.needsUpdate = true
    return cloned
  }, [loadedTexture])

  return (
    <meshStandardMaterial
      map={texture}
      color={isSelected ? '#4f46e5' : '#ffffff'}
      side={THREE.DoubleSide}
      transparent={opacity < 1}
      opacity={opacity}
    />
  )
}

export const FloorManager: React.FC = () => {
  const floors = useInteriorStore(state => state.floors)
  const selectedId = useInteriorStore(state => state.selectedId)
  const setSelected = useInteriorStore(state => state.setSelected)
  const mode = useInteriorStore(state => state.mode)
  const activeLevel = useInteriorStore(state => state.activeLevel)

  return (
    <group>
      {floors.map(floor => {
        const floorLevel = floor.level ?? 0
        const floorOpacity = floorLevel === activeLevel ? 1 : 0.3
        return (
          <group key={floor.id} position={[0, floorLevel * 3, 0]}>
            <FloorMesh
              floor={floor}
              isSelected={floor.id === selectedId}
              onClick={e => {
                e.stopPropagation()
                if (mode === 'SELECT') {
                  setSelected(floor.id)
                }
              }}
              opacity={floorOpacity}
            />
          </group>
        )
      })}
    </group>
  )
}
