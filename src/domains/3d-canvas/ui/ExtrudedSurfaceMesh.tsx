/* eslint-disable react/no-unknown-property */
'use client'

import React from 'react'
import { Extrude } from '@react-three/drei'
import { ThreeEvent } from '@react-three/fiber'
import * as THREE from 'three'
import type { Surface } from '@/domains/3d-canvas'
import {
  SurfaceGeometryKind,
  SurfaceMaterialColor,
  type SurfaceRenderConfig,
} from '@/domains/3d-canvas/constants/surface-render-config'

function buildExtrudeGeometry(
  surface: Surface
): { type: SurfaceGeometryKind; shape: THREE.Shape } | null {
  if (!surface.points || surface.points.length < 2) return null
  if (surface.isPath) return null

  const vectors = surface.points.map(p => new THREE.Vector3(...p))
  const shape = new THREE.Shape()
  shape.moveTo(vectors[0].x, vectors[0].z)
  vectors.slice(1).forEach(v => shape.lineTo(v.x, v.z))
  shape.lineTo(vectors[0].x, vectors[0].z)
  return { type: SurfaceGeometryKind.Shape, shape }
}

function ExtrudedSurfaceMaterial({
  surface,
  config,
  textureMap,
  opacity,
  usePhysical,
}: {
  surface: Surface
  config: SurfaceRenderConfig
  textureMap: THREE.Texture | null
  opacity: number
  usePhysical: boolean
}) {
  const color = surface.texture ? SurfaceMaterialColor.White : config.color
  const map = surface.texture ? textureMap : null
  const metalness = surface.metalness ?? config.metalness
  const roughness = surface.roughness ?? config.roughness
  const matOpacity = (config.opacity || 1) * opacity
  const transparent = opacity < 1 || (!!config.opacity && config.opacity < 1)
  const envMapIntensity = surface.texture ? 1.0 : 0.5

  if (usePhysical && (config.transmission || 0) > 0) {
    return (
      <meshPhysicalMaterial
        color={color}
        map={map}
        metalness={metalness}
        roughness={roughness}
        transmission={config.transmission || 0}
        opacity={matOpacity}
        transparent={transparent}
        envMapIntensity={envMapIntensity}
      />
    )
  }

  return (
    <meshStandardMaterial
      color={color}
      map={map}
      metalness={metalness}
      roughness={roughness}
      opacity={matOpacity}
      transparent={transparent}
      envMapIntensity={envMapIntensity}
    />
  )
}

export const ExtrudedSurfaceMesh: React.FC<{
  surface: Surface
  config: SurfaceRenderConfig
  textureMap: THREE.Texture | null
  opacity: number
  isSelected: boolean
  onClick: (e: ThreeEvent<MouseEvent>) => void
  usePhysical: boolean
}> = ({ surface, config, textureMap, opacity, isSelected, onClick, usePhysical }) => {
  const geometry = buildExtrudeGeometry(surface)
  if (!geometry || geometry.type !== SurfaceGeometryKind.Shape) return null

  return (
    <group
      position={[0, config.verticalOffset, 0]}
      rotation={surface.rotation ? new THREE.Euler(...surface.rotation) : new THREE.Euler(0, 0, 0)}
      userData={{ id: surface.id }}
      name={surface.id}
    >
      <Extrude
        args={[geometry.shape, { depth: config.depth, bevelEnabled: false }]}
        rotation={[Math.PI / 2, 0, 0]}
        onClick={onClick}
        castShadow
        receiveShadow
      >
        <ExtrudedSurfaceMaterial
          surface={surface}
          config={config}
          textureMap={textureMap}
          opacity={opacity}
          usePhysical={usePhysical}
        />
        {isSelected ? (
          <lineSegments>
            <edgesGeometry
              args={[
                new THREE.ExtrudeGeometry(geometry.shape, {
                  depth: config.depth,
                  bevelEnabled: false,
                }),
              ]}
            />
            <lineBasicMaterial color={SurfaceMaterialColor.Highlight} />
          </lineSegments>
        ) : null}
      </Extrude>

      {isSelected ? (
        <group>
          {surface.points.map((p, i) => (
            <mesh
              key={i}
              position={new THREE.Vector3(p[0], config.verticalOffset, p[2])}
              userData={{ isControlPoint: true, index: i, surfaceId: surface.id }}
            >
              <sphereGeometry args={[0.2]} />
              <meshBasicMaterial color={SurfaceMaterialColor.White} />
            </mesh>
          ))}
        </group>
      ) : null}
    </group>
  )
}
