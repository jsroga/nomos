/* eslint-disable react/no-unknown-property */
'use client'

import React from 'react'
import { useInteriorStore } from '@/domains/interior-designer/store/useInteriorStore'
import * as THREE from 'three'
import { useTexture } from '@react-three/drei'

import { Wall } from '@/domains/interior-designer/store/useInteriorStore'
import { ThreeEvent } from '@react-three/fiber'

const WallMesh: React.FC<{
  wall: Wall
  isSelected: boolean
  onClick: (e: ThreeEvent<MouseEvent>) => void
}> = ({ wall, isSelected, onClick }) => {
  const start = new THREE.Vector3(...wall.start)
  const end = new THREE.Vector3(...wall.end)
  const direction = new THREE.Vector3().subVectors(end, start)
  const length = direction.length()
  const angle = Math.atan2(direction.z, direction.x)
  const midPoint = new THREE.Vector3().addVectors(start, end).multiplyScalar(0.5)

  const textureUrl = wall.texture && wall.texture.startsWith('http') ? wall.texture : null
  const color = !textureUrl ? wall.texture || '#e2e8f0' : '#ffffff'

  return (
    <mesh
      position={[midPoint.x, wall.height / 2, midPoint.z]}
      rotation={[0, -angle, 0]}
      onClick={onClick}
      userData={{ id: wall.id }}
    >
      <boxGeometry args={[length, wall.height, wall.thickness]} />
      {textureUrl ? (
        <TexturedMaterial url={textureUrl} isSelected={isSelected} />
      ) : (
        <meshStandardMaterial color={isSelected ? '#4f46e5' : color} roughness={0.8} />
      )}
    </mesh>
  )
}

const TexturedMaterial: React.FC<{ url: string; isSelected: boolean }> = ({ url, isSelected }) => {
  const texture = useTexture(url)

  React.useLayoutEffect(() => {
    texture.wrapS = texture.wrapT = THREE.RepeatWrapping
    // texture.repeat.set(1, 1)
    texture.needsUpdate = true
  }, [texture])

  return (
    <meshStandardMaterial
      map={texture}
      color={isSelected ? '#4f46e5' : '#ffffff'}
      roughness={0.8}
    />
  )
}

export const WallManager: React.FC = () => {
  const walls = useInteriorStore(state => state.walls)
  const selectedId = useInteriorStore(state => state.selectedId)
  const multiSelectedIds = useInteriorStore(state => state.multiSelectedIds)
  const setSelected = useInteriorStore(state => state.setSelected)
  const toggleMultiSelect = useInteriorStore(state => state.toggleMultiSelect)
  const mode = useInteriorStore(state => state.mode)
  const activeLevel = useInteriorStore(state => state.activeLevel)

  return (
    <group position={[0, activeLevel * 3, 0]}>
      {walls.map(wall => (
        <WallMesh
          key={wall.id}
          wall={wall}
          isSelected={wall.id === selectedId || multiSelectedIds.includes(wall.id)}
          onClick={e => {
            e.stopPropagation()
            if (mode === 'SELECT') {
              if (e.shiftKey) {
                toggleMultiSelect(wall.id)
              } else {
                setSelected(wall.id)
              }
            }
          }}
        />
      ))}
    </group>
  )
}
