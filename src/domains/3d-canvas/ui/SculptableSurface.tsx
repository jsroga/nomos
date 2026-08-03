/**
 * SculptableSurface v3 - Fixed Reactivity + Lighting
 */

import React, { useRef, useEffect, useMemo, useState } from 'react'
import * as THREE from 'three'
import type { ThreeEvent } from '@react-three/fiber'
import { useInteriorStore, Surface } from '@/domains/3d-canvas'
import { TerrainColor } from '@/domains/3d-canvas/constants/terrain-defaults'
import {
  TERRAIN_MESH_NAME,
  TERRAIN_WALLS_MESH_NAME,
} from '@/domains/3d-canvas/constants/three-js'
import type { SurfaceRenderConfig } from '@/domains/3d-canvas/constants/surface-render-config'
import { vec2 } from '@/domains/3d-canvas/core/vec3'
import { VoxelTerrainMesh } from './VoxelTerrainMesh'
import { SculptableSurfaceOverlay } from './SculptableSurfaceOverlay'
import {
  computeSurfaceBounds,
  sampleHeightmap,
  writeHeightmapToTexture,
} from './sculptable-surface-helpers'
import {
  buildSculptableTopGeometry,
  buildSculptableWallGeometry,
} from './sculptable-surface-geometry'
import {
  buildSculptableSurfaceFragmentShader,
  SCULPTABLE_SURFACE_MAX_POLYGON_VERTICES,
  SCULPTABLE_SURFACE_WORLD_SIZE,
  sculptableSurfaceVertexShader,
} from './sculptable-surface-shaders'

interface SculptableSurfaceProps {
  surface: Surface
  config: SurfaceRenderConfig
  opacity: number
  isSelected: boolean
  onClick?: (e: ThreeEvent<MouseEvent>) => void
  textureMap: THREE.Texture | null
  geometry: { type: string; shape: THREE.Shape }
  isGenerating?: boolean
}

const fragmentShader = buildSculptableSurfaceFragmentShader(SCULPTABLE_SURFACE_MAX_POLYGON_VERTICES)

export const SculptableSurface: React.FC<SculptableSurfaceProps> = ({
  surface,
  config,
  opacity,
  isSelected,
  onClick,
  textureMap,
  isGenerating = false,
}) => {
  const groupRef = useRef<THREE.Group>(null)
  const topMeshRef = useRef<THREE.Mesh>(null)
  const wallMeshRef = useRef<THREE.Mesh>(null)
  const materialRef = useRef<THREE.ShaderMaterial | null>(null)
  const heightmapTextureRef = useRef<THREE.DataTexture | null>(null)
  const [_wallGeometryVersion, setWallGeometryVersion] = useState(0)

  const quality = useInteriorStore(state => state.terrainSettings.quality)
  const voxelMode = useInteriorStore(state => state.terrainBrush.pixelate)
  const heightmap = useInteriorStore(state => state.terrainSettings.heightmap)
  const heightmapSize = useInteriorStore(state => state.terrainSettings.heightmapSize)
  const baseGroundHeight = useInteriorStore(state => state.terrainSettings.baseGroundHeight)

  useEffect(() => {
    let prevVersion = useInteriorStore.getState().terrainSettings.heightmapVersion

    const unsubscribe = useInteriorStore.subscribe(state => {
      if (state.terrainSettings.heightmapVersion !== prevVersion) {
        prevVersion = state.terrainSettings.heightmapVersion
        const { heightmap: nextHeightmap, baseGroundHeight: baseHeight } = state.terrainSettings

        if (nextHeightmap && heightmapTextureRef.current) {
          writeHeightmapToTexture(nextHeightmap, heightmapTextureRef.current, baseHeight)
        }

        setWallGeometryVersion(v => v + 1)
      }
    })
    return () => unsubscribe()
  }, [])

  const bounds = useMemo(() => computeSurfaceBounds(surface.points), [surface.points])

  const heightmapTexture = useMemo(() => {
    const size = heightmapSize > 0 ? heightmapSize : 64
    const data = new Float32Array(size * size)

    if (heightmap && heightmapSize > 0) {
      const maxDisplacement = 10
      for (let i = 0; i < heightmap.length; i++) {
        data[i] = (heightmap[i] - baseGroundHeight) / maxDisplacement + 0.5
      }
    } else {
      data.fill(0.5)
    }

    const texture = new THREE.DataTexture(data, size, size, THREE.RedFormat, THREE.FloatType)
    texture.needsUpdate = true
    texture.wrapS = texture.wrapT = THREE.ClampToEdgeWrapping
    texture.magFilter = texture.minFilter = THREE.LinearFilter
    return texture
  }, [heightmapSize, heightmap, baseGroundHeight])

  useEffect(() => {
    heightmapTextureRef.current = heightmapTexture
  }, [heightmapTexture])

  const topGeometry = useMemo(() => {
    if (!bounds) return null
    return buildSculptableTopGeometry({ bounds, quality, color: config.color })
  }, [bounds, quality, config.color])

  const topMaterial = useMemo(() => {
    if (!bounds || !surface.points) return null

    const polygon2D = surface.points.map(p => vec2(p[0], p[2]))
    const width = bounds.maxX - bounds.minX
    const depth = bounds.maxZ - bounds.minZ
    const paddedVertices: THREE.Vector2[] = []

    for (let i = 0; i < SCULPTABLE_SURFACE_MAX_POLYGON_VERTICES; i++) {
      if (i < polygon2D.length) {
        paddedVertices.push(new THREE.Vector2(polygon2D[i][0], polygon2D[i][1]))
      } else {
        paddedVertices.push(new THREE.Vector2(0, 0))
      }
    }

    const mat = new THREE.ShaderMaterial({
      uniforms: {
        heightmapTexture: { value: heightmapTexture },
        displacementScale: { value: 10 },
        terrainWorldSize: { value: SCULPTABLE_SURFACE_WORLD_SIZE },
        boundsMin: { value: new THREE.Vector2(bounds.minX, bounds.minZ) },
        boundsSize: { value: new THREE.Vector2(width, depth) },
        groundColor: { value: new THREE.Color(config.color || TerrainColor.Ground) },
        opacity: { value: (config.opacity || 1) * opacity },
        polygonVertices: { value: paddedVertices },
        vertexCount: { value: polygon2D.length },
        textureMap: { value: textureMap },
        hasTexture: { value: !!textureMap },
        metalness: { value: config.metalness || 0.1 },
        roughness: { value: config.roughness || 0.8 },
      },
      vertexShader: sculptableSurfaceVertexShader,
      fragmentShader,
      side: THREE.DoubleSide,
      transparent: true,
    })

    return mat
  }, [
    bounds,
    surface.points,
    config.color,
    config.opacity,
    opacity,
    textureMap,
    config.metalness,
    config.roughness,
    heightmapTexture,
  ])

  useEffect(() => {
    materialRef.current = topMaterial
  }, [topMaterial])

  const wallGeometry = useMemo(() => {
    if (!bounds || !surface.points || surface.points.length < 3) return null
    return buildSculptableWallGeometry({
      points: surface.points,
      config,
      heightmap,
      heightmapSize,
      baseHeight: baseGroundHeight,
    })
  }, [bounds, surface.points, config, heightmap, heightmapSize, baseGroundHeight])

  const wallMaterial = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        vertexColors: true,
        side: THREE.DoubleSide,
      }),
    []
  )

  useEffect(() => {
    return () => {
      heightmapTextureRef.current?.dispose()
      materialRef.current?.dispose()
    }
  }, [])

  if (!topGeometry || !topMaterial || !bounds) return null

  return (
    <group
      ref={groupRef}
      position={[0, config.verticalOffset || 0.01, 0]}
      userData={{ id: surface.id, isTerrain: true }}
      onClick={onClick}
    >
      {voxelMode && (
        <VoxelTerrainMesh
          surface={surface}
          opacity={opacity}
          color={config.color || TerrainColor.Ground}
        />
      )}

      {!voxelMode && (
        <>
          <mesh
            ref={topMeshRef}
            name={TERRAIN_MESH_NAME}
            geometry={topGeometry}
            material={topMaterial}
            receiveShadow
            castShadow
          />
          {wallGeometry && (
            <mesh
              ref={wallMeshRef}
              name={TERRAIN_WALLS_MESH_NAME}
              geometry={wallGeometry}
              material={wallMaterial}
              receiveShadow
              castShadow
            />
          )}
        </>
      )}

      {isSelected &&
        surface.points.map((p, i) => {
          const h = sampleHeightmap(p[0], p[2], heightmap, heightmapSize, baseGroundHeight)
          return (
            <mesh
              key={i}
              position={[
                p[0],
                (config.verticalOffset || 0) + (h - baseGroundHeight),
                p[2],
              ]}
              userData={{ isControlPoint: true, index: i, surfaceId: surface.id }}
            >
              <sphereGeometry args={[0.2]} />
              <meshBasicMaterial color="white" />
            </mesh>
          )
        })}

      {isGenerating && <SculptableSurfaceOverlay bounds={bounds} config={config} />}
    </group>
  )
}
