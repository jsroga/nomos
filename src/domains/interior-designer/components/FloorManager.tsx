/* eslint-disable react/no-unknown-property */
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
}> = ({ floor, isSelected, onClick }) => {
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
        <TexturedMaterial url={textureUrl} isSelected={isSelected} />
      ) : (
        <meshStandardMaterial color={isSelected ? '#4f46e5' : color} side={THREE.DoubleSide} />
      )}
    </mesh>
  )
}

const TexturedMaterial: React.FC<{ url: string; isSelected: boolean }> = ({ url, isSelected }) => {
  const texture = useTexture(url)

  React.useLayoutEffect(() => {
    texture.wrapS = texture.wrapT = THREE.RepeatWrapping
    texture.repeat.set(0.5, 0.5)
    texture.needsUpdate = true
  }, [texture])

  return (
    <meshStandardMaterial
      map={texture}
      color={isSelected ? '#4f46e5' : '#ffffff'}
      side={THREE.DoubleSide}
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
    <group position={[0, activeLevel * 3, 0]}>
      {floors.map(floor => (
        <FloorMesh
          key={floor.id}
          floor={floor}
          isSelected={floor.id === selectedId}
          onClick={e => {
            e.stopPropagation()
            if (mode === 'SELECT') {
              setSelected(floor.id)
            }
          }}
        />
      ))}
    </group>
  )
}
