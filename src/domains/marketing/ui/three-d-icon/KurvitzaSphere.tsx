'use client'

import { useRef, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { MarketingThreeDColor } from '@/domains/marketing/constants/three-d-icon'
import { KURVITZA_FRAGMENT_SHADER, KURVITZA_VERTEX_SHADER } from './kurvitza-shaders'

interface KurvitzaSphereProps {
  position?: [number, number, number]
  radius?: number
  color?: string
  distortion?: number
  speed?: number
  frequency?: number
  contrast?: number
  twist?: number
  metalness?: number
  glowScale?: number
}

export function KurvitzaSphere({
  position = [0, 0, 0] satisfies [number, number, number],
  radius = 0.12,
  color = MarketingThreeDColor.KurvitzaDefault,
  distortion = 0.4,
  speed = 1,
  frequency = 1.0,
  contrast = 4.0,
  twist = 0.5,
  metalness = 0.8,
  glowScale = 1.0,
}: KurvitzaSphereProps) {
  const meshRef = useRef<THREE.Mesh>(null)

  const uniforms = useMemo(
    () => ({
      u_time: { value: 0 },
      u_distortion: { value: distortion },
      u_speed: { value: speed },
      u_frequency: { value: frequency },
      u_twist: { value: twist },
      u_contrast: { value: contrast },
      u_metalness: { value: metalness },
      u_color: { value: new THREE.Color(color) },
    }),
    [color, contrast, distortion, frequency, metalness, speed, twist]
  )

  useFrame((state: { clock: { elapsedTime: number } }) => {
    if (!meshRef.current) return

    const material = meshRef.current.material
    if (!(material instanceof THREE.ShaderMaterial)) return

    material.uniforms.u_time.value = state.clock.elapsedTime
    material.uniforms.u_distortion.value = distortion
    material.uniforms.u_speed.value = speed
    material.uniforms.u_frequency.value = frequency
    material.uniforms.u_twist.value = twist
    material.uniforms.u_contrast.value = contrast
    material.uniforms.u_metalness.value = metalness
    material.uniforms.u_color.value.set(color)

    meshRef.current.rotation.y = state.clock.elapsedTime * 0.1 * speed
    meshRef.current.rotation.z = state.clock.elapsedTime * 0.05 * speed
  })

  return (
    <group position={position}>
      <mesh ref={meshRef} key={`sphere-${radius}`}>
        <icosahedronGeometry args={[radius, 32]} />
        <shaderMaterial
          fragmentShader={KURVITZA_FRAGMENT_SHADER}
          vertexShader={KURVITZA_VERTEX_SHADER}
          uniforms={uniforms}
        />
      </mesh>

      <mesh
        scale={1.0 + Math.pow(Math.max(0, glowScale), 3) * 0.2}
        key={`halo-${radius}-${glowScale}`}
      >
        <sphereGeometry args={[radius, 32, 32]} />
        <meshBasicMaterial
          color={color}
          transparent
          opacity={0.05 * Math.pow(Math.max(0, glowScale), 2)}
          side={THREE.BackSide}
          blending={THREE.AdditiveBlending}
        />
      </mesh>
    </group>
  )
}
