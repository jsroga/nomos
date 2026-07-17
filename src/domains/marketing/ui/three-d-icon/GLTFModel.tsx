'use client'

import { useRef, useMemo } from 'react'
import { useFrame, type RootState } from '@react-three/fiber'
import { useGLTF } from '@react-three/drei'
import * as THREE from 'three'
import { MarketingThreeDColor } from '@/domains/marketing/constants/three-d-icon'
import { KurvitzaSphere } from './KurvitzaSphere'
import { PointCloudDots } from './PointCloudDots'

export interface GLTFModelProps {
  url: string
  scale?: number
  dotsColor?: string
  dotsDensity?: number
  glowScale?: number
  distortion?: number
  speed?: number
  includeSphere?: boolean
}

export function GLTFModel({
  url,
  scale = 1,
  dotsColor = MarketingThreeDColor.White,
  dotsDensity = 0.25,
  glowScale = 1,
  distortion = 0,
  speed = 2,
  includeSphere = true,
}: GLTFModelProps) {
  const groupRef = useRef<THREE.Group>(null)
  const gltf = useGLTF(url)

  const geometries = useMemo(() => {
    if (!gltf) return []
    const geos: THREE.BufferGeometry[] = []

    gltf.scene.traverse((child: THREE.Object3D) => {
      if (child instanceof THREE.Mesh && child.geometry) {
        const geo = child.geometry.clone()
        if (child.matrixWorld) {
          geo.applyMatrix4(child.matrixWorld)
        }
        geo.computeVertexNormals()
        geos.push(geo)
      }
    })
    return geos
  }, [gltf])

  useFrame((state: RootState) => {
    if (groupRef.current) {
      groupRef.current.rotation.y = state.clock.elapsedTime * 0.12
    }
  })

  if (geometries.length === 0) {
    return null
  }

  return (
    <group ref={groupRef} scale={scale}>
      {geometries.map((geo, i) => (
        <PointCloudDots key={i} geometry={geo} color={dotsColor} density={dotsDensity} />
      ))}
      {includeSphere && (
        <KurvitzaSphere
          position={[0.2, 0.1, 0.3]}
          radius={0.15 * glowScale}
          distortion={distortion}
          speed={speed}
        />
      )}
    </group>
  )
}
