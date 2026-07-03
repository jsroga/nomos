/* eslint-disable react/no-unknown-property */
'use client'

import React, { useMemo } from 'react'
import {
  useInteriorStore,
  Surface,
  SurfaceType,
} from '@/domains/interior-designer/store/useInteriorStore'
import { useGlobalStatusStore } from '@/shared/jobs/useGlobalStatusStore'
import * as THREE from 'three'
import { Extrude } from '@react-three/drei'
import { RoadMesh } from '@/domains/interior-designer/components/meshes/RoadMesh'
import { SculptableSurface } from './SculptableSurface'
import { getCachedTexture } from '@/domains/interior-designer/utils/textureCache'

// Helper to check if a surface is being generated
const useSurfaceGenerating = (surfaceId: string) => {
  const operations = useGlobalStatusStore(state => state.operations)
  const operationId = `material-${surfaceId}`
  const operation = operations.find(op => op.id === operationId)
  return operation && (operation.status === 'pending' || operation.status === 'in-progress')
}

// Configuration for rendering each surface type
const SURFACE_RENDER_CONFIG: Record<
  SurfaceType,
  {
    color: string
    metalness: number
    roughness: number
    transmission?: number
    opacity?: number
    emissive?: string
    depth: number // height extrusion
    verticalOffset: number // to prevent z-fighting
  }
> = {
  grass: {
    color: '#4ade80',
    metalness: 0,
    roughness: 1,
    depth: 0.5,
    verticalOffset: 0,
  },
  water: {
    color: '#06b6d4',
    metalness: 0.1,
    roughness: 0.1,
    transmission: 0.9,
    opacity: 0.8,
    depth: 0.45, // Slightly less than ground? Or make it deep.
    verticalOffset: -0.05, // Slightly sunken
  },
  dirt: {
    color: '#d97706',
    metalness: 0,
    roughness: 1,
    depth: 0.5,
    verticalOffset: 0.005, // On top of grass
  },
  road: {
    color: '#374151',
    metalness: 0,
    roughness: 0.8,
    depth: 0.05, // Roads remain fairly thin overlays or pavers
    verticalOffset: 0.01, // On top of dirt/grass
  },
  pavement: {
    color: '#9ca3af',
    metalness: 0,
    roughness: 0.5,
    depth: 0.2, // Pavement usually implies a slab
    verticalOffset: 0.01,
  },
  mars: {
    color: '#9f3528',
    metalness: 0,
    roughness: 1,
    depth: 0.5,
    verticalOffset: 0,
  },
  sand: {
    color: '#fcd34d',
    metalness: 0,
    roughness: 0.9,
    depth: 0.5,
    verticalOffset: 0,
  },
  rock: {
    color: '#57534e',
    metalness: 0,
    roughness: 1,
    depth: 0.5,
    verticalOffset: 0.01,
  },
  wall: {
    color: '#9ca3af',
    metalness: 0.1,
    roughness: 0.6,
    depth: 0.2,
    verticalOffset: 0.01,
  },
}

export const SurfaceManager: React.FC = () => {
  const surfaces = useInteriorStore(state => state.surfaces)
  const activeLevel = useInteriorStore(state => state.activeLevel)
  const selectedId = useInteriorStore(state => state.selectedId)
  const setSelected = useInteriorStore(state => state.setSelected)
  const mode = useInteriorStore(state => state.mode)
  const removeSurface = useInteriorStore(state => state.removeSurface)
  const groundColor = useInteriorStore(state => state.terrainSettings.groundColor)
  const waterColor = useInteriorStore(state => state.terrainSettings.waterColor)

  return (
    <group>
      {surfaces.map(surface => {
        const surfaceLevel = surface.level ?? 0
        const isOnActiveLevel = surfaceLevel === activeLevel
        return (
          <group key={surface.id} position={[0, surfaceLevel * 3, 0]}>
            <SurfaceRenderer
              surface={surface}
              isSelected={surface.id === selectedId}
              onClick={e => {
                e.stopPropagation()
                if (mode === 'SELECT') setSelected(surface.id)
                // Allow deleting in Surface mode with Alt key, handy for cleanup
                if (mode === 'SURFACE' && e.altKey) removeSurface(surface.id)
              }}
              opacity={isOnActiveLevel ? 1 : 0.3}
              groundColor={groundColor}
              waterColor={waterColor}
            />
          </group>
        )
      })}
    </group>
  )
}

const SurfaceRenderer: React.FC<{
  surface: Surface
  isSelected: boolean
  onClick: (e: any) => void
  opacity?: number
  groundColor: string
  waterColor: string
}> = ({ surface, isSelected, onClick, opacity = 1, groundColor, waterColor }) => {
  const isGenerating = useSurfaceGenerating(surface.id)

  const config = useMemo(() => {
    const base = SURFACE_RENDER_CONFIG[surface.type]
    if (surface.type === 'water') return { ...base, color: waterColor }
    // For ground types (grass, dirt, sand, rock, mars), use the global ground color
    const groundTypes = ['grass', 'dirt', 'sand', 'rock', 'mars']
    if (groundTypes.includes(surface.type)) return { ...base, color: groundColor }
    return base
  }, [surface.type, groundColor, waterColor])

  // OPTIMIZATION: Use shared texture cache instead of creating new loader per surface
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

  // Geometry Generation
  // Only for Shapes now (Ground, Mars, etc)
  const geometry = useMemo(() => {
    if (!surface.points || surface.points.length < 2) return null
    if (surface.isPath) return null // RoadMesh handles paths independently now

    const vectors = surface.points.map(p => new THREE.Vector3(...p))

    // Area Generation
    const shape = new THREE.Shape()
    shape.moveTo(vectors[0].x, vectors[0].z)
    vectors.slice(1).forEach(v => shape.lineTo(v.x, v.z))
    shape.lineTo(vectors[0].x, vectors[0].z)
    return { type: 'shape', shape }
  }, [surface])

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

  // For ground surfaces (sculptable), use the new SculptableSurface component
  // Check types: grass, dirt, sand, rock, mars
  // Check types: grass, dirt, sand, rock, mars, road, pavement
  const sculptableTypes = ['grass', 'dirt', 'sand', 'rock', 'mars', 'road', 'pavement']
  if (sculptableTypes.includes(surface.type) && geometry.type === 'shape') {
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
    <group
      position={[0, config.verticalOffset, 0]}
      rotation={surface.rotation ? new THREE.Euler(...surface.rotation) : new THREE.Euler(0, 0, 0)}
      userData={{ id: surface.id }}
      name={surface.id}
    >
      {geometry.type === 'shape' && (
        <Extrude
          args={[geometry.shape as THREE.Shape, { depth: config.depth, bevelEnabled: false }]}
          rotation={[Math.PI / 2, 0, 0]}
          onClick={onClick}
          castShadow
          receiveShadow
        >
          <meshPhysicalMaterial
            color={surface.texture ? 'white' : config.color} // Use white if texture is present so it doesn't tint
            map={surface.texture ? textureMap : null}
            metalness={surface.metalness ?? config.metalness}
            roughness={surface.roughness ?? config.roughness}
            transmission={config.transmission || 0}
            opacity={(config.opacity || 1) * opacity}
            transparent={opacity < 1 || (!!config.opacity && config.opacity < 1)}
            envMapIntensity={surface.texture ? 1.0 : 0.5} // Add some environment mapping for nicer look if texture is present
          />
          {isSelected && (
            <lineSegments>
              <edgesGeometry
                args={[
                  new THREE.ExtrudeGeometry(geometry.shape as THREE.Shape, {
                    depth: config.depth,
                    bevelEnabled: false,
                  }),
                ]}
              />
              <lineBasicMaterial color="#ffffff" />
            </lineSegments>
          )}
        </Extrude>
      )}

      {isSelected && (
        <group>
          {/* Highlight control points */}
          {surface.points.map((p, i) => (
            <mesh
              key={i}
              position={new THREE.Vector3(p[0], config.verticalOffset, p[2])}
              userData={{ isControlPoint: true, index: i, surfaceId: surface.id }}
            >
              <sphereGeometry args={[0.2]} />
              <meshBasicMaterial color="white" />
            </mesh>
          ))}
        </group>
      )}
    </group>
  )
}
