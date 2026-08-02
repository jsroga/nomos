'use client'

import { useMemo } from 'react'
import { useFrame, type RootState } from '@react-three/fiber'
import * as THREE from 'three'
import { BufferGeometryAttribute } from '@/shared/three/constants/buffer-geometry-attribute'
import { MarketingThreeDColor } from '@/domains/marketing/constants/three-d-icon'
import { MarketingMediaQuery } from '@/domains/marketing/constants/viewport-3d'
import {
  POINT_CLOUD_DENSITY_MAX,
  POINT_CLOUD_DENSITY_MIN,
  POINT_CLOUD_DENSITY_MOBILE_SCALE,
  POINT_CLOUD_MAX_POINTS,
} from '@/domains/marketing/constants/point-cloud'
import { DOTS_FRAGMENT_SHADER, DOTS_VERTEX_SHADER } from './dots-shaders'

function clampDensity(density: number): number {
  const capped = Math.min(POINT_CLOUD_DENSITY_MAX, Math.max(POINT_CLOUD_DENSITY_MIN, density))
  if (typeof window === 'undefined') return capped
  if (!window.matchMedia(MarketingMediaQuery.MobileMaxWidth).matches) return capped
  return Math.max(POINT_CLOUD_DENSITY_MIN, capped * POINT_CLOUD_DENSITY_MOBILE_SCALE)
}

function geometryToPoints(
  geometry: THREE.BufferGeometry,
  density: number = 0.5,
): { positions: Float32Array; sizes: Float32Array; brightnesses: Float32Array } {
  const positions: number[] = []
  const sizes: number[] = []
  const brightnesses: number[] = []

  const posAttr = geometry.attributes.position
  const normalAttr = geometry.attributes.normal
  const safeDensity = clampDensity(density)
  let step = Math.max(1, Math.round(1 / safeDensity))

  const approxCount = Math.ceil(posAttr.count / step)
  if (approxCount > POINT_CLOUD_MAX_POINTS) {
    step = Math.max(step, Math.ceil(posAttr.count / POINT_CLOUD_MAX_POINTS))
  }

  for (let i = 0; i < posAttr.count; i += step) {
    positions.push(posAttr.getX(i), posAttr.getY(i), posAttr.getZ(i))
    sizes.push(0.008 + Math.random() * 0.006)

    if (normalAttr) {
      const ny = normalAttr.getY(i)
      brightnesses.push(0.5 + ny * 0.35 + Math.random() * 0.15)
    } else {
      brightnesses.push(0.55 + Math.random() * 0.25)
    }
  }

  return {
    positions: new Float32Array(positions),
    sizes: new Float32Array(sizes),
    brightnesses: new Float32Array(brightnesses),
  }
}

interface PointCloudDotsProps {
  geometry: THREE.BufferGeometry
  color?: string
  density?: number
}

export function PointCloudDots({
  geometry,
  color = MarketingThreeDColor.White,
  density = 0.15,
}: PointCloudDotsProps) {
  const pointsData = useMemo(() => geometryToPoints(geometry, density), [geometry, density])

  const pointsGeometry = useMemo(() => {
    const geo = new THREE.BufferGeometry()
    geo.setAttribute(
      BufferGeometryAttribute.Position,
      new THREE.BufferAttribute(pointsData.positions, 3),
    )
    geo.setAttribute(BufferGeometryAttribute.Size, new THREE.BufferAttribute(pointsData.sizes, 1))
    geo.setAttribute(
      BufferGeometryAttribute.Brightness,
      new THREE.BufferAttribute(pointsData.brightnesses, 1),
    )
    return geo
  }, [pointsData])

  const material = useMemo(() => {
    return new THREE.ShaderMaterial({
      vertexShader: DOTS_VERTEX_SHADER,
      fragmentShader: DOTS_FRAGMENT_SHADER,
      uniforms: {
        color: { value: new THREE.Color(color) },
        time: { value: 0 },
      },
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    })
  }, [color])

  useFrame((state: RootState) => {
    if (material.uniforms.time) {
      material.uniforms.time.value = state.clock.elapsedTime * 0.5
    }
  })

  return <points geometry={pointsGeometry} material={material} />
}
