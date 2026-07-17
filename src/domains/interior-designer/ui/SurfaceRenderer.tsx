/* eslint-disable react/no-unknown-property */
'use client'

import React, { useMemo } from 'react'
import { Surface } from '@/domains/interior-designer'
import { useGlobalStatusStore } from '@/shared/jobs/useGlobalStatusStore'
import { isActiveOperationStatus } from '@/shared/jobs/constants/async-operation-status'
import * as THREE from 'three'
import { Extrude } from '@react-three/drei'
import { ThreeEvent } from '@react-three/fiber'
import { RoadMesh } from '@/domains/interior-designer/ui/meshes/RoadMesh'
import { SculptableSurface } from './SculptableSurface'
import { getCachedTexture } from '@/domains/interior-designer/core/textureCache'
import {
  GROUND_TINT_SURFACE_TYPES,
  SCULPTABLE_SURFACE_TYPES,
  SURFACE_RENDER_CONFIG,
  SurfaceGeometryKind,
  SurfaceMaterialColor,
} from '@/domains/interior-designer/constants/surface-render-config'
import { SurfaceTypeValue } from '@/domains/interior-designer/constants/terrain-defaults'

function useSurfaceGenerating(surfaceId: string): boolean {
  const operations = useGlobalStatusStore(state => state.operations)
  const operationId = `material-${surfaceId}`
  const operation = operations.find(op => op.id === operationId)
  return Boolean(operation && isActiveOperationStatus(operation.status))
}

function sculptableTypesIncludes(type: Surface['type']): boolean {
  return SCULPTABLE_SURFACE_TYPES.includes(type)
}

function buildSurfaceConfig(
  surface: Surface,
  groundColor: string,
  waterColor: string
) {
  const base = SURFACE_RENDER_CONFIG[surface.type]
  if (surface.type === SurfaceTypeValue.Water) return { ...base, color: waterColor }
  if (GROUND_TINT_SURFACE_TYPES.includes(surface.type)) {
    return { ...base, color: groundColor }
  }
  return base
}

function buildSurfaceGeometry(
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

const ExtrudedSurfaceMesh: React.FC<{
  surface: Surface
  config: ReturnType<typeof buildSurfaceConfig>
  textureMap: THREE.Texture | null
  opacity: number
  isSelected: boolean
  onClick: (e: ThreeEvent<MouseEvent>) => void
}> = ({ surface, config, textureMap, opacity, isSelected, onClick }) => {
  const geometry = buildSurfaceGeometry(surface)
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
        <meshPhysicalMaterial
          color={surface.texture ? SurfaceMaterialColor.White : config.color}
          map={surface.texture ? textureMap : null}
          metalness={surface.metalness ?? config.metalness}
          roughness={surface.roughness ?? config.roughness}
          transmission={config.transmission || 0}
          opacity={(config.opacity || 1) * opacity}
          transparent={opacity < 1 || (!!config.opacity && config.opacity < 1)}
          envMapIntensity={surface.texture ? 1.0 : 0.5}
        />
        {isSelected && (
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
        )}
      </Extrude>

      {isSelected && (
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
      )}
    </group>
  )
}

export const SurfaceRenderer: React.FC<{
  surface: Surface
  isSelected: boolean
  onClick: (e: ThreeEvent<MouseEvent>) => void
  opacity?: number
  groundColor: string
  waterColor: string
}> = ({ surface, isSelected, onClick, opacity = 1, groundColor, waterColor }) => {
  const isGenerating = useSurfaceGenerating(surface.id)
  const config = useMemo(
    () => buildSurfaceConfig(surface, groundColor, waterColor),
    [surface, groundColor, waterColor]
  )

  const textureMap = useMemo(() => {
    if (!surface.texture) return null
    const tex = getCachedTexture(surface.texture, {
      wrapS: THREE.RepeatWrapping,
      wrapT: THREE.RepeatWrapping,
    })
    if (tex) {
      const scale = surface.textureScale ?? 0.5
      tex.repeat.set(scale, scale)
    }
    return tex
  }, [surface.texture, surface.textureScale])

  const geometry = useMemo(() => buildSurfaceGeometry(surface), [surface])

  if (surface.isPath) {
    return (
      <RoadMesh
        surface={surface}
        config={config}
        isSelected={isSelected}
        onClick={onClick}
        opacity={opacity}
        isGenerating={isGenerating}
      />
    )
  }

  if (!geometry) return null

  if (sculptableTypesIncludes(surface.type) && geometry.type === SurfaceGeometryKind.Shape) {
    return (
      <SculptableSurface
        surface={surface}
        config={config}
        isSelected={isSelected}
        onClick={onClick}
        opacity={opacity}
        textureMap={textureMap}
        geometry={geometry}
        isGenerating={isGenerating}
      />
    )
  }

  return (
    <ExtrudedSurfaceMesh
      surface={surface}
      config={config}
      textureMap={textureMap}
      opacity={opacity}
      isSelected={isSelected}
      onClick={onClick}
    />
  )
}
