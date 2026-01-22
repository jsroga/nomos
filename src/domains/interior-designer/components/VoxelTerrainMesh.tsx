/**
 * VoxelTerrainMesh - Minecraft-style cube terrain rendering
 *
 * Uses THREE.InstancedMesh for efficient GPU rendering of cube blocks.
 * Block size is determined by fidelity setting: blockSize = 5 / fidelity
 *
 * OPTIMIZATIONS:
 * - Object pooling for Matrix4 and Color objects
 * - Adaptive LOD based on surface area
 * - Selective store subscriptions
 * - Proper disposal on unmount
 */

import React, { useMemo, useRef, useEffect, useCallback } from 'react'
import * as THREE from 'three'
import { useInteriorStore, Surface } from '@/domains/interior-designer/store/useInteriorStore'

interface VoxelTerrainMeshProps {
  surface: Surface
  opacity?: number
  color?: string
}

const TERRAIN_WORLD_SIZE = 64

// Reusable temp objects for calculations (OPTIMIZATION: object pooling)
const tempMatrix = new THREE.Matrix4()
const tempColor = new THREE.Color()

// Sample heightmap at world position
function sampleHeightmap(
  worldX: number,
  worldZ: number,
  heightmap: Float32Array | null,
  heightmapSize: number,
  baseHeight: number
): number {
  if (!heightmap || heightmapSize <= 0) return baseHeight

  const gridX = Math.floor((worldX + TERRAIN_WORLD_SIZE / 2) * (heightmapSize / TERRAIN_WORLD_SIZE))
  const gridZ = Math.floor((worldZ + TERRAIN_WORLD_SIZE / 2) * (heightmapSize / TERRAIN_WORLD_SIZE))

  if (gridX < 0 || gridX >= heightmapSize || gridZ < 0 || gridZ >= heightmapSize) {
    return baseHeight
  }

  return heightmap[gridZ * heightmapSize + gridX]
}

// Check if point is inside polygon (ray casting algorithm)
function pointInPolygon(x: number, z: number, points: [number, number, number][]): boolean {
  let inside = false
  for (let i = 0, j = points.length - 1; i < points.length; j = i++) {
    const xi = points[i][0],
      zi = points[i][2]
    const xj = points[j][0],
      zj = points[j][2]

    if (zi > z !== zj > z && x < ((xj - xi) * (z - zi)) / (zj - zi) + xi) {
      inside = !inside
    }
  }
  return inside
}

export const VoxelTerrainMesh: React.FC<VoxelTerrainMeshProps> = React.memo(
  function VoxelTerrainMesh({ surface, opacity = 1, color }) {
    const meshRef = useRef<THREE.InstancedMesh>(null)

    // OPTIMIZATION: Selective subscriptions - only subscribe to what we need
    const heightmap = useInteriorStore(state => state.terrainSettings.heightmap)
    const heightmapSize = useInteriorStore(state => state.terrainSettings.heightmapSize)
    const baseGroundHeight = useInteriorStore(state => state.terrainSettings.baseGroundHeight)
    const storeGroundColor = useInteriorStore(state => state.terrainSettings.groundColor)
    const fidelity = useInteriorStore(state => state.terrainBrush.fidelity)

    const heightmapVersion = useInteriorStore(state => state.terrainSettings.heightmapVersion)

    // Use prop color or fall back to store groundColor
    const effectiveColor = color || storeGroundColor

    // Calculate bounding box
    const bounds = useMemo(() => {
      if (!surface.points || surface.points.length < 3) return null
      const xs = surface.points.map(p => p[0])
      const zs = surface.points.map(p => p[2])
      return {
        minX: Math.min(...xs),
        maxX: Math.max(...xs),
        minZ: Math.min(...zs),
        maxZ: Math.max(...zs),
      }
    }, [surface.points])

    // OPTIMIZATION: Adaptive block size based on surface area (LOD)
    const blockSize = useMemo(() => {
      const baseBlockSize = 5 / fidelity

      if (!bounds) return baseBlockSize

      const area = (bounds.maxX - bounds.minX) * (bounds.maxZ - bounds.minZ)

      // Large surfaces: use coarser blocks for performance
      if (area > 500) return baseBlockSize * 2
      if (area > 200) return baseBlockSize * 1.5

      return baseBlockSize
    }, [fidelity, bounds])

    // Generate instanced cube positions (OPTIMIZED: uses temp objects)
    const instanceData = useMemo(() => {
      if (!bounds) return { count: 0, matrices: new Float32Array(0), colors: new Float32Array(0) }

      const matrices: number[] = []
      const colors: number[] = []

      // Pre-calculate colors once
      const groundColorObj = tempColor.set(effectiveColor)
      const groundR = groundColorObj.r,
        groundG = groundColorObj.g,
        groundB = groundColorObj.b
      const darkR = groundR * 0.7,
        darkG = groundG * 0.7,
        darkB = groundB * 0.7

      // Iterate over the surface in block-sized steps
      for (let x = bounds.minX; x < bounds.maxX; x += blockSize) {
        for (let z = bounds.minZ; z < bounds.maxZ; z += blockSize) {
          // Check if block center is inside polygon
          const centerX = x + blockSize / 2
          const centerZ = z + blockSize / 2

          if (!pointInPolygon(centerX, centerZ, surface.points)) continue

          // Sample height at this position (use base height if no heightmap)
          const height = heightmap
            ? sampleHeightmap(centerX, centerZ, heightmap, heightmapSize, baseGroundHeight)
            : baseGroundHeight
          const relativeHeight = height - baseGroundHeight

          // Calculate number of blocks to stack (at least 1 for the base layer)
          const stackCount = Math.max(1, Math.ceil(Math.max(0.1, relativeHeight) / blockSize))

          // Create blocks for this column (OPTIMIZATION: reuse tempMatrix)
          for (let layer = 0; layer < stackCount; layer++) {
            const yPos = baseGroundHeight + layer * blockSize + blockSize / 2

            tempMatrix.makeTranslation(centerX, yPos, centerZ)

            // Push matrix elements directly to array
            const elements = tempMatrix.elements
            for (let i = 0; i < 16; i++) {
              matrices.push(elements[i])
            }

            // Top layer gets brighter color, others get darker
            if (layer === stackCount - 1) {
              colors.push(groundR, groundG, groundB)
            } else {
              colors.push(darkR, darkG, darkB)
            }
          }
        }
      }

      return {
        count: matrices.length / 16,
        matrices: new Float32Array(matrices),
        colors: new Float32Array(colors),
      }
    }, [
      bounds,
      heightmap,
      heightmapSize,
      baseGroundHeight,
      blockSize,
      surface.points,
      effectiveColor,
      heightmapVersion,
    ])

    // Update instance matrices when data changes
    useEffect(() => {
      if (!meshRef.current || instanceData.count === 0) return

      const mesh = meshRef.current

      // OPTIMIZATION: Direct buffer update instead of per-instance setMatrixAt
      const matrixArray = mesh.instanceMatrix.array as Float32Array
      matrixArray.set(instanceData.matrices)
      mesh.instanceMatrix.needsUpdate = true

      // Set instance colors
      if (mesh.instanceColor) {
        const colorArray = mesh.instanceColor.array as Float32Array
        colorArray.set(instanceData.colors)
        mesh.instanceColor.needsUpdate = true
      }

      mesh.count = instanceData.count
    }, [instanceData])

    // Create box geometry (shared across all instances)
    const boxGeometry = useMemo(() => {
      return new THREE.BoxGeometry(blockSize * 0.98, blockSize * 0.98, blockSize * 0.98)
    }, [blockSize])

    // Create material - use solid color (not vertex colors to avoid black on init)
    const material = useMemo(() => {
      return new THREE.MeshStandardMaterial({
        color: effectiveColor,
        roughness: 0.8,
        metalness: 0.1,
        transparent: opacity < 1,
        opacity: opacity,
      })
    }, [effectiveColor, opacity])

    // OPTIMIZATION: Proper cleanup on unmount
    useEffect(() => {
      return () => {
        boxGeometry?.dispose()
        material?.dispose()
      }
    }, [boxGeometry, material])

    if (!bounds || instanceData.count === 0) return null

    // Max instances (need to allocate buffer upfront)
    const maxInstances = Math.max(1000, instanceData.count * 2)

    return (
      <instancedMesh
        ref={meshRef}
        args={[boxGeometry, material, maxInstances]}
        castShadow
        receiveShadow
        frustumCulled={true} // OPTIMIZATION: Enable frustum culling
        userData={{ id: surface.id, isTerrain: true, isVoxel: true }}
      />
    )
  }
)
