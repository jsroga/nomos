/* eslint-disable react/no-unknown-property */
'use client'

import React, { useEffect, useMemo } from 'react'
import { Surface, useInteriorStore } from '@/domains/3d-canvas'
import { useGlobalStatusStore } from '@/shared/jobs/useGlobalStatusStore'
import { isActiveOperationStatus } from '@/shared/jobs/constants/async-operation-status'
import * as THREE from 'three'
import { ThreeEvent } from '@react-three/fiber'
import { RoadMesh } from '@/domains/3d-canvas/ui/meshes/RoadMesh'
import { SculptableSurface } from './SculptableSurface'
import { ExtrudedSurfaceMesh } from './ExtrudedSurfaceMesh'
import { getCachedTexture, releaseCachedTexture } from '@/domains/3d-canvas/core/textureCache'
import { resolveEffectiveRenderConfig } from '@/domains/3d-canvas/core/render-quality'
import {
  GROUND_TINT_SURFACE_TYPES,
  SCULPTABLE_SURFACE_TYPES,
  SURFACE_RENDER_CONFIG,
  SurfaceGeometryKind,
} from '@/domains/3d-canvas/constants/surface-render-config'
import { SurfaceTypeValue } from '@/domains/3d-canvas/constants/terrain-defaults'

function useSurfaceGenerating(surfaceId: string): boolean {
  const operations = useGlobalStatusStore(state => state.operations)
  const operationId = `material-${surfaceId}`
  const operation = operations.find(op => op.id === operationId)
  return Boolean(operation && isActiveOperationStatus(operation.status))
}

function buildSurfaceConfig(surface: Surface, groundColor: string, waterColor: string) {
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

export const SurfaceRenderer: React.FC<{
  surface: Surface
  isSelected: boolean
  onClick: (e: ThreeEvent<MouseEvent>) => void
  opacity?: number
  groundColor: string
  waterColor: string
}> = ({ surface, isSelected, onClick, opacity = 1, groundColor, waterColor }) => {
  const isGenerating = useSurfaceGenerating(surface.id)
  const renderQuality = useInteriorStore(state => state.renderQuality)
  const interactionActive = useInteriorStore(state => state.interactionActive)
  const usePhysical = resolveEffectiveRenderConfig(
    renderQuality,
    interactionActive
  ).usePhysicalMaterials

  const config = useMemo(
    () => buildSurfaceConfig(surface, groundColor, waterColor),
    [surface, groundColor, waterColor]
  )

  const textureMap = useMemo(() => {
    if (!surface.texture) return null
    const scale = surface.textureScale ?? 0.5
    return getCachedTexture(surface.texture, {
      wrapS: THREE.RepeatWrapping,
      wrapT: THREE.RepeatWrapping,
      repeat: [scale, scale],
    })
  }, [surface.texture, surface.textureScale])

  useEffect(() => {
    return () => {
      if (surface.texture) {
        releaseCachedTexture(surface.texture, textureMap)
      }
    }
  }, [surface.texture, textureMap])

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

  if (SCULPTABLE_SURFACE_TYPES.includes(surface.type) && geometry.type === SurfaceGeometryKind.Shape) {
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
      usePhysical={usePhysical}
    />
  )
}
