/**
 * SculptableSurface v3 - Fixed Reactivity + Lighting
 *
 * Features:
 * - GPU polygon clipping for perfect edges
 * - Proper heightmap reactivity via zustand subscription
 * - Lighting with normal calculation from heightmap
 * - Adaptive side walls that update on sculpt
 */

import React, { useRef, useEffect, useMemo, useState } from 'react'
import * as THREE from 'three'
import { useFrame, type ThreeEvent } from '@react-three/fiber'
import {
  useInteriorStore,
  Surface,
  TERRAIN_QUALITY_RESOLUTION,
} from '@/domains/interior-designer'
import { TerrainColor } from '@/domains/interior-designer/constants/terrain-defaults'
import {
  TERRAIN_WALL_SIDE_COLOR,
} from '@/domains/interior-designer/constants/mesh-colors'
import {
  BufferGeometryAttribute,
  TERRAIN_MESH_NAME,
  TERRAIN_WALLS_MESH_NAME,
} from '@/domains/interior-designer/constants/three-js'
import type { SurfaceRenderConfig } from '@/domains/interior-designer/constants/surface-render-config'
import { vec2 } from '@/domains/interior-designer/core/vec3'
import { VoxelTerrainMesh } from './VoxelTerrainMesh'

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

const TERRAIN_WORLD_SIZE = 64
const MAX_POLYGON_VERTICES = 32

function writeHeightmapToTexture(
  heightmap: Float32Array,
  texture: THREE.DataTexture,
  baseHeight: number
): void {
  const rawData = texture.image.data
  if (!(rawData instanceof Float32Array)) return
  const imageData: Float32Array = rawData

  const maxDisplacement = 10
  for (let i = 0; i < heightmap.length && i < imageData.length; i++) {
    imageData[i] = (heightmap[i] - baseHeight) / maxDisplacement + 0.5
  }
  texture.needsUpdate = true
}

// ============================================================
// GPU POLYGON CLIP SHADER WITH LIGHTING
// ============================================================

const vertexShader = /* glsl */ `
    uniform sampler2D heightmapTexture;
    uniform float displacementScale;
    uniform vec2 boundsMin;
    uniform vec2 boundsSize;
    uniform float terrainWorldSize;
    uniform vec2 heightmapUVOffset;
    uniform vec2 heightmapUVScale;
    
    varying vec2 vWorldXZ;
    varying vec2 vUv;
    varying float vHeight;
    varying vec3 vColor;
    varying vec3 vNormal;
    varying vec3 vViewPosition;
    
    attribute vec3 color;
    
    // Sample heightmap with world-to-heightmap UV mapping
    float sampleHeight(vec2 worldXZ) {
        vec2 hmUV = (worldXZ + terrainWorldSize * 0.5) / terrainWorldSize;
        return texture2D(heightmapTexture, hmUV).r;
    }
    
    void main() {
        vUv = uv;
        vColor = color;
        
        // Calculate world XZ from mesh position (mesh is at world coords)
        vWorldXZ = position.xz;
        
        // Sample heightmap at world position
        float height = sampleHeight(vWorldXZ);
        vHeight = height;
        
        // Apply displacement
        vec3 newPosition = position;
        newPosition.y += (height - 0.5) * displacementScale;
        
        // Calculate normal from heightmap gradients
        float epsilon = terrainWorldSize / 128.0;
        float hL = sampleHeight(vWorldXZ + vec2(-epsilon, 0.0));
        float hR = sampleHeight(vWorldXZ + vec2(epsilon, 0.0));
        float hD = sampleHeight(vWorldXZ + vec2(0.0, -epsilon));
        float hU = sampleHeight(vWorldXZ + vec2(0.0, epsilon));
        
        vec3 calcNormal = normalize(vec3(
            (hL - hR) * displacementScale,
            2.0 * epsilon,
            (hD - hU) * displacementScale
        ));
        vNormal = normalMatrix * calcNormal;
        
        vec4 mvPosition = modelViewMatrix * vec4(newPosition, 1.0);
        vViewPosition = -mvPosition.xyz;
        
        gl_Position = projectionMatrix * mvPosition;
    }
`

const fragmentShader = /* glsl */ `
    uniform vec3 groundColor;
    uniform float opacity;
    uniform vec2 polygonVertices[${MAX_POLYGON_VERTICES}];
    uniform int vertexCount;
    uniform sampler2D textureMap;
    uniform bool hasTexture;
    uniform float metalness;
    uniform float roughness;
    
    varying vec2 vWorldXZ;
    varying vec2 vUv;
    varying float vHeight;
    varying vec3 vColor;
    varying vec3 vNormal;
    varying vec3 vViewPosition;
    
    // Ray casting point-in-polygon test
    bool isInsidePolygon(vec2 point) {
        bool inside = false;
        
        for (int i = 0; i < ${MAX_POLYGON_VERTICES}; i++) {
            if (i >= vertexCount) break;
            
            int j = i == 0 ? vertexCount - 1 : i - 1;
            
            vec2 vi = polygonVertices[i];
            vec2 vj = polygonVertices[j];
            
            if ((vi.y > point.y) != (vj.y > point.y) &&
                point.x < (vj.x - vi.x) * (point.y - vi.y) / (vj.y - vi.y) + vi.x) {
                inside = !inside;
            }
        }
        
        return inside;
    }
    
    void main() {
        // PERFECT EDGE: discard pixels outside polygon
        if (!isInsidePolygon(vWorldXZ)) {
            discard;
        }
        
        // Base color
        vec3 color = vColor;
        if (hasTexture) {
            color *= texture2D(textureMap, vUv * 4.0).rgb;
        }
        
        // Simple lighting
        vec3 normal = normalize(vNormal);
        vec3 viewDir = normalize(vViewPosition);
        
        // Directional light from above-right
        vec3 lightDir = normalize(vec3(0.5, 1.0, 0.3));
        float NdotL = max(dot(normal, lightDir), 0.0);
        
        // Ambient + Diffuse
        float ambient = 0.4;
        float diffuse = 0.6 * NdotL;
        
        // Height-based tinting
        float heightFactor = smoothstep(0.3, 0.7, vHeight);
        color = mix(color * 0.9, color * 1.1, heightFactor);
        
        color *= (ambient + diffuse);
        
        gl_FragColor = vec4(color, opacity);
    }
`

// ============================================================
// UTILITY FUNCTIONS
// ============================================================

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

// ============================================================
// MAIN COMPONENT
// ============================================================

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

  // Force re-render counter for reactivity
  const [updateCounter, setUpdateCounter] = useState(0)

  const quality = useInteriorStore(state => state.terrainSettings.quality)
  const voxelMode = useInteriorStore(state => state.terrainBrush.pixelate)

  // Subscribe to heightmap changes and update data
  useEffect(() => {
    let prevVersion = useInteriorStore.getState().terrainSettings.heightmapVersion

    const unsubscribe = useInteriorStore.subscribe(state => {
      if (state.terrainSettings.heightmapVersion !== prevVersion) {
        prevVersion = state.terrainSettings.heightmapVersion

        // Update texture data directly
        const { heightmap: nextHeightmap, baseGroundHeight: baseHeight } = state.terrainSettings

        if (nextHeightmap && heightmapTextureRef.current) {
          writeHeightmapToTexture(nextHeightmap, heightmapTextureRef.current, baseHeight)
        }

        // Force wall geometry update
        setUpdateCounter(c => c + 1)
      }
    })
    return () => unsubscribe()
  }, [])

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

  // Create heightmap texture (once, then update data reactively)
  const heightmapTexture = useMemo(() => {
    const state = useInteriorStore.getState()
    const heightmap = state.terrainSettings.heightmap
    const heightmapSize = state.terrainSettings.heightmapSize
    const baseHeight = state.terrainSettings.baseGroundHeight

    const size = heightmapSize > 0 ? heightmapSize : 64
    const data = new Float32Array(size * size)

    if (heightmap && heightmapSize > 0) {
      const maxDisplacement = 10
      for (let i = 0; i < heightmap.length; i++) {
        const displacement = heightmap[i] - baseHeight
        data[i] = displacement / maxDisplacement + 0.5
      }
    } else {
      data.fill(0.5)
    }

    const texture = new THREE.DataTexture(data, size, size, THREE.RedFormat, THREE.FloatType)
    texture.needsUpdate = true
    texture.wrapS = texture.wrapT = THREE.ClampToEdgeWrapping
    texture.magFilter = texture.minFilter = THREE.LinearFilter
    heightmapTextureRef.current = texture
    return texture
  }, [surface.id]) // Recreate per surface

  // Create top surface geometry (simple grid)
  const topGeometry = useMemo(() => {
    if (!bounds) return null

    const width = bounds.maxX - bounds.minX
    const depth = bounds.maxZ - bounds.minZ
    const resolution = TERRAIN_QUALITY_RESOLUTION[quality]
    const segX = Math.max(2, Math.ceil(width * resolution))
    const segZ = Math.max(2, Math.ceil(depth * resolution))

    const positions: number[] = []
    const uvs: number[] = []
    const colors: number[] = []
    const indices: number[] = []

    const groundColor = new THREE.Color(config.color || TerrainColor.Ground)

    for (let iz = 0; iz <= segZ; iz++) {
      for (let ix = 0; ix <= segX; ix++) {
        const x = bounds.minX + (ix / segX) * width
        const z = bounds.minZ + (iz / segZ) * depth
        positions.push(x, 0, z)
        uvs.push(ix / segX, iz / segZ)
        colors.push(groundColor.r, groundColor.g, groundColor.b)
      }
    }

    for (let iz = 0; iz < segZ; iz++) {
      for (let ix = 0; ix < segX; ix++) {
        const a = iz * (segX + 1) + ix
        indices.push(a, a + segX + 1, a + 1)
        indices.push(a + 1, a + segX + 1, a + segX + 2)
      }
    }

    const geo = new THREE.BufferGeometry()
    geo.setAttribute(BufferGeometryAttribute.Position, new THREE.Float32BufferAttribute(positions, 3))
    geo.setAttribute(BufferGeometryAttribute.Uv, new THREE.Float32BufferAttribute(uvs, 2))
    geo.setAttribute(BufferGeometryAttribute.Color, new THREE.Float32BufferAttribute(colors, 3))
    geo.setIndex(indices)
    geo.computeVertexNormals()

    return geo
  }, [bounds, quality, config.color])

  // Create GPU polygon clip material with lighting
  const topMaterial = useMemo(() => {
    if (!bounds || !surface.points) return null

    const polygon2D = surface.points.map(p => vec2(p[0], p[2]))
    const width = bounds.maxX - bounds.minX
    const depth = bounds.maxZ - bounds.minZ

    const paddedVertices: THREE.Vector2[] = []
    for (let i = 0; i < MAX_POLYGON_VERTICES; i++) {
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
        terrainWorldSize: { value: TERRAIN_WORLD_SIZE },
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
      vertexShader,
      fragmentShader,
      side: THREE.DoubleSide,
      transparent: true,
    })

    materialRef.current = mat
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

  // Create side wall geometry (regenerated on heightmap change)
  const wallGeometry = useMemo(() => {
    if (!bounds || !surface.points || surface.points.length < 3) return null

    const state = useInteriorStore.getState()
    const heightmap = state.terrainSettings.heightmap
    const heightmapSize = state.terrainSettings.heightmapSize
    const baseHeight = state.terrainSettings.baseGroundHeight
    const wallDepth = config.depth || 1

    const n = surface.points.length
    const positions: number[] = []
    const colors: number[] = []
    const indices: number[] = []
    let vertexIndex = 0

    const wallColor = new THREE.Color(TERRAIN_WALL_SIDE_COLOR)
    const edgeSubdivisions = 20

    for (let i = 0; i < n; i++) {
      const p1 = surface.points[i]
      const p2 = surface.points[(i + 1) % n]

      for (let j = 0; j < edgeSubdivisions; j++) {
        const t1 = j / edgeSubdivisions
        const t2 = (j + 1) / edgeSubdivisions

        const x1 = p1[0] + (p2[0] - p1[0]) * t1
        const z1 = p1[2] + (p2[2] - p1[2]) * t1
        const x2 = p1[0] + (p2[0] - p1[0]) * t2
        const z2 = p1[2] + (p2[2] - p1[2]) * t2

        const h1 = sampleHeightmap(x1, z1, heightmap, heightmapSize, baseHeight) - baseHeight
        const h2 = sampleHeightmap(x2, z2, heightmap, heightmapSize, baseHeight) - baseHeight

        const topY1 = h1 + 0.02
        const topY2 = h2 + 0.02
        const bottomY = -wallDepth

        positions.push(x1, topY1, z1)
        positions.push(x1, bottomY, z1)
        positions.push(x2, topY2, z2)
        positions.push(x2, bottomY, z2)

        for (let k = 0; k < 4; k++) {
          colors.push(wallColor.r, wallColor.g, wallColor.b)
        }

        indices.push(vertexIndex, vertexIndex + 1, vertexIndex + 2)
        indices.push(vertexIndex + 2, vertexIndex + 1, vertexIndex + 3)

        vertexIndex += 4
      }
    }

    const geo = new THREE.BufferGeometry()
    geo.setAttribute(BufferGeometryAttribute.Position, new THREE.Float32BufferAttribute(positions, 3))
    geo.setAttribute(BufferGeometryAttribute.Color, new THREE.Float32BufferAttribute(colors, 3))
    geo.setIndex(indices)
    geo.computeVertexNormals()

    return geo
  }, [bounds, surface.points, config.depth, updateCounter]) // updateCounter triggers rebuild

  // Wall material
  const wallMaterial = useMemo(() => {
    return new THREE.MeshStandardMaterial({
      vertexColors: true,
      side: THREE.DoubleSide,
    })
  }, [])

  // Cleanup on unmount
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
      {/* Voxel Mode: Render Minecraft-style cubes */}
      {voxelMode && (
        <VoxelTerrainMesh surface={surface} opacity={opacity} color={config.color || TerrainColor.Ground} />
      )}

      {/* Smooth Mode: Original GPU polygon clipping */}
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

          {/* Side walls that follow terrain height */}
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

      {/* Control points when selected */}
      {isSelected &&
        surface.points.map((p, i) => {
          const state = useInteriorStore.getState()
          const h = sampleHeightmap(
            p[0],
            p[2],
            state.terrainSettings.heightmap,
            state.terrainSettings.heightmapSize,
            state.terrainSettings.baseGroundHeight
          )
          return (
            <mesh
              key={i}
              position={[
                p[0],
                (config.verticalOffset || 0) + (h - state.terrainSettings.baseGroundHeight),
                p[2],
              ]}
              userData={{ isControlPoint: true, index: i, surfaceId: surface.id }}
            >
              <sphereGeometry args={[0.2]} />
              <meshBasicMaterial color="white" />
            </mesh>
          )
        })}

      {/* Generating overlay - shown when AI material generation is in progress */}
      {isGenerating && bounds && <GeneratingOverlay bounds={bounds} config={config} />}
    </group>
  )
}

// Pulsing overlay component to indicate generation in progress
const GeneratingOverlay: React.FC<{
  bounds: { minX: number; maxX: number; minZ: number; maxZ: number } | null
  config: SurfaceRenderConfig
}> = ({ bounds, config }) => {
  const meshRef = useRef<THREE.Mesh>(null)
  const materialRef = useRef<THREE.MeshBasicMaterial>(null)

  // Animate the opacity
  useFrame(state => {
    if (materialRef.current) {
      // Pulsing effect: opacity oscillates between 0.2 and 0.5
      const pulse = 0.35 + Math.sin(state.clock.elapsedTime * 3) * 0.15
      materialRef.current.opacity = pulse
    }
  })

  // Defensive null check - bounds can become null during re-renders
  if (!bounds) {
    return null
  }

  const width = bounds.maxX - bounds.minX
  const depth = bounds.maxZ - bounds.minZ
  const centerX = (bounds.minX + bounds.maxX) / 2
  const centerZ = (bounds.minZ + bounds.maxZ) / 2

  return (
    <mesh
      ref={meshRef}
      position={[centerX, (config.verticalOffset || 0) + 0.5, centerZ]}
      rotation={[-Math.PI / 2, 0, 0]}
    >
      <planeGeometry args={[width, depth]} />
      <meshBasicMaterial
        ref={materialRef}
        color="#3b82f6"
        transparent
        opacity={0.35}
        side={THREE.DoubleSide}
        depthWrite={false}
      />
    </mesh>
  )
}
