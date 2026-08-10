import * as THREE from 'three'
import React, { useMemo, useRef, useEffect, useCallback } from 'react'
import { ThreeEvent } from '@react-three/fiber'
import { CATMULL_ROM_CURVE_TYPE } from '@/domains/3d-canvas/constants/three-js'
import { useInteriorStore, Surface } from '@/domains/3d-canvas'
import { getCachedTexture, releaseCachedTexture } from '@/domains/3d-canvas/core/textureCache'
import { computeRoadExtrudeSteps } from '@/domains/3d-canvas/core/road-extrude-steps'
import { resolveEffectiveRenderConfig } from '@/domains/3d-canvas/core/render-quality'

interface RoadMeshProps {
  surface: Surface
  config: {
    width?: number
    depth: number
    verticalOffset: number
    color: string
    roughness: number
    metalness: number
    opacity?: number
  }
  isSelected: boolean
  onClick: (e: ThreeEvent<MouseEvent>) => void
  opacity?: number
  isGenerating?: boolean
}

// Constants
const TERRAIN_SIZE = 64

export const RoadMesh: React.FC<RoadMeshProps> = ({
  surface,
  config,
  isSelected,
  onClick,
  opacity = 1,
}) => {
  // Refs
  const meshRef = useRef<THREE.Mesh>(null)
  const originalPositionsRef = useRef<Float32Array | null>(null)
  const materialRef = useRef<THREE.MeshStandardMaterial | null>(null)

  // 1. Generate the Procedural Geometry using ExtrudeGeometry
  const geometry = useMemo(() => {
    if (!surface.points || surface.points.length < 2) return null

    const points = surface.points.map(p => new THREE.Vector3(p[0], 0, p[2]))

    // Check if loop
    const isClosed = points.length > 2 && points[0].distanceTo(points[points.length - 1]) < 0.5

    // IMPORTANT: If closed, CatmullRom expects unique control points.
    // We must remove the last point if it duplicates the first, otherwise we get a kink/knot.
    const curvePoints = isClosed ? points.slice(0, -1) : points

    const tension = surface.roundness ?? 0.5
    const curve = surface.curved
      ? new THREE.CatmullRomCurve3(curvePoints, isClosed, CATMULL_ROM_CURVE_TYPE, tension)
      : new THREE.CatmullRomCurve3(curvePoints, isClosed, CATMULL_ROM_CURVE_TYPE, 0)

    // Shape Generation
    const shape = new THREE.Shape()

    if (surface.isVertical) {
      // Wall Mode: Extruded Vertically
      // Based on Road behavior (X=Up, Y=Sideways), we need to swap dimensions.

      const thickness = surface.width || 0.5
      const height = surface.height || 0.1

      // Define rectangle:
      // X-axis = Vertical Height (0 to Height)
      // Y-axis = Horizontal Thickness (-Thickness/2 to Thickness/2)

      // If User says Positive Height goes DOWN, then +X is Down.
      // We want to go UP, so we should go towards Negative X.
      // Shape: 0 (Ground) to -Height (Up)

      shape.moveTo(0, -thickness / 2)
      shape.lineTo(0, thickness / 2)
      shape.lineTo(-height, thickness / 2)
      shape.lineTo(-height, -thickness / 2)
      shape.lineTo(0, -thickness / 2)
    } else {
      // Road Mode: Flat on Ground
      const width = surface.width || config.width || 2
      const halfWidth = width / 2
      const depth = config.depth // This is the thickness/height of the road (very small usually)

      // For flat roads, we need the shape to extend horizontally (width side to side)
      // Shape X = perpendicular to extrusion path (horizontal width)
      // Shape Y = height above ground (minimal depth for road surface)
      // Swap axes so width is along X (horizontal) and depth is along Y (vertical)

      shape.moveTo(-halfWidth, 0)
      shape.lineTo(halfWidth, 0)
      shape.lineTo(halfWidth, depth)
      shape.lineTo(-halfWidth, depth)
      shape.lineTo(-halfWidth, 0)
    }

    // ... (rest of extrusion)

    const length = curve.getLength()
    const steps = computeRoadExtrudeSteps(length)

    const extrudeSettings = {
      steps: steps,
      extrudePath: curve,
      bevelEnabled: false,
    }

    return new THREE.ExtrudeGeometry(shape, extrudeSettings)
  }, [
    surface.points,
    surface.curved,
    surface.width,
    surface.height,
    surface.isVertical,
    surface.roundness,
    config.width,
    config.depth,
  ])

  const renderQuality = useInteriorStore(state => state.renderQuality)
  const interactionActive = useInteriorStore(state => state.interactionActive)
  const deferNormals = resolveEffectiveRenderConfig(renderQuality, interactionActive).roadDeferNormals

  // 2. Load Texture using cached texture loader (OPTIMIZATION: shared texture cache)
  const textureMap = useMemo(() => {
    if (!surface.texture) return null
    const scale = surface.textureScale ?? 1
    return getCachedTexture(surface.texture, {
      wrapS: THREE.RepeatWrapping,
      wrapT: THREE.RepeatWrapping,
      repeat: [1, scale],
    })
  }, [surface.texture, surface.textureScale])

  useEffect(() => {
    return () => {
      if (surface.texture) {
        releaseCachedTexture(surface.texture, textureMap)
      }
    }
  }, [surface.texture, textureMap])

  // Store original positions once geometry is created
  useEffect(() => {
    if (!geometry) return
    if (!(geometry.attributes.position.array instanceof Float32Array)) return
    const positions = geometry.attributes.position.array
    originalPositionsRef.current = new Float32Array(positions)
  }, [geometry])

  // Displacement function - optimized with direct state access
  const applyHeightmapDisplacement = useCallback(
    (computeNormals: boolean) => {
      if (!meshRef.current || !geometry || !originalPositionsRef.current || surface.isVertical) return

      const { heightmap, heightmapSize, baseGroundHeight } =
        useInteriorStore.getState().terrainSettings

      if (!heightmap) return

      const geo = meshRef.current.geometry
      const posAttribute = geo.attributes.position
      const original = originalPositionsRef.current

      for (let i = 0; i < posAttribute.count; i++) {
        const origX = original[i * 3]
        const origY = original[i * 3 + 1]
        const origZ = original[i * 3 + 2]

        const worldX = origX
        const worldZ = origZ

        const gridX = Math.floor((worldX + TERRAIN_SIZE / 2) * (heightmapSize / TERRAIN_SIZE))
        const gridZ = Math.floor((worldZ + TERRAIN_SIZE / 2) * (heightmapSize / TERRAIN_SIZE))

        let h = baseGroundHeight
        if (gridX >= 0 && gridX < heightmapSize && gridZ >= 0 && gridZ < heightmapSize) {
          h = heightmap[gridZ * heightmapSize + gridX]
        }

        posAttribute.setXYZ(i, origX, origY + h + (config.verticalOffset || 0.01), origZ)
      }

      posAttribute.needsUpdate = true
      if (computeNormals) {
        geo.computeVertexNormals()
      }
    },
    [geometry, surface.isVertical, config.verticalOffset]
  )

  // Initial displacement
  useEffect(() => {
    applyHeightmapDisplacement(true)
  }, [applyHeightmapDisplacement])

  // OPTIMIZATION: Subscribe only to heightmapVersion changes for reactivity
  useEffect(() => {
    let prevVersion = useInteriorStore.getState().terrainSettings.heightmapVersion

    const unsubscribe = useInteriorStore.subscribe(state => {
      if (state.terrainSettings.heightmapVersion !== prevVersion) {
        prevVersion = state.terrainSettings.heightmapVersion
        const interacting = state.interactionActive
        const quality = state.renderQuality
        const defer = resolveEffectiveRenderConfig(quality, interacting).roadDeferNormals
        applyHeightmapDisplacement(!defer)
      }
    })

    return unsubscribe
  }, [applyHeightmapDisplacement])

  // Recompute normals when interaction ends
  useEffect(() => {
    if (!deferNormals) {
      applyHeightmapDisplacement(true)
    }
  }, [deferNormals, applyHeightmapDisplacement])

  // OPTIMIZATION: Proper cleanup on unmount to prevent memory leaks
  useEffect(() => {
    return () => {
      if (geometry) {
        geometry.dispose()
      }
      if (materialRef.current) {
        materialRef.current.dispose()
      }
    }
  }, [geometry])

  if (!geometry) return null

  return (
    <mesh
      ref={meshRef}
      geometry={geometry}
      userData={{ id: surface.id }}
      onClick={onClick}
      receiveShadow
      castShadow
    >
      <meshStandardMaterial
        ref={materialRef}
        color={surface.texture ? 'white' : config.color}
        map={textureMap}
        metalness={config.metalness}
        roughness={config.roughness}
        opacity={(config.opacity || 1) * opacity}
        transparent={opacity < 1}
        side={THREE.DoubleSide}
      />
      {isSelected && (
        <lineSegments>
          <edgesGeometry args={[geometry]} />
          <lineBasicMaterial color="#ffffff" />
        </lineSegments>
      )}
    </mesh>
  )
}
