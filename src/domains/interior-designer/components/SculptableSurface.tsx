import React, { useRef, useEffect, useCallback, useMemo } from 'react'
import * as THREE from 'three'
import { useInteriorStore, Surface, TerrainMaterialType } from '@/domains/interior-designer/store/useInteriorStore'

interface SculptableSurfaceProps {
    surface: Surface
    config: any
    opacity: number
    isSelected: boolean
    onClick?: (e: any) => void
    textureMap: THREE.Texture | null
    geometry: { type: string; shape: THREE.Shape }
}

const TERRAIN_WORLD_SIZE = 64

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

export const SculptableSurface: React.FC<SculptableSurfaceProps> = ({
    surface,
    config,
    opacity,
    isSelected,
    onClick,
    textureMap,
    geometry
}) => {
    const meshRef = useRef<THREE.Mesh>(null)
    const topMeshRef = useRef<THREE.Mesh>(null)
    const originalPositionsRef = useRef<Float32Array | null>(null)
    const topOriginalPositionsRef = useRef<Float32Array | null>(null)

    // 1. Create the base geometry (Sides & Bottom)
    const baseGeometry = useMemo(() => {
        if (!geometry?.shape) return null
        const extrudeSettings = {
            depth: config.depth,
            bevelEnabled: false
        }
        const geo = new THREE.ExtrudeGeometry(geometry.shape, extrudeSettings)

        // Cache original positions for displacement
        originalPositionsRef.current = new Float32Array(geo.attributes.position.array)
        return geo
    }, [geometry?.shape, config.depth])

    // 2. Create high-resolution top plane for sculpting
    const topPlaneGeometry = useMemo(() => {
        if (!geometry?.shape || !surface.points) return null

        // Calculate bounding box of the shape to size the plane
        const box = new THREE.Box2()
        surface.points.forEach(p => box.expandByPoint(new THREE.Vector2(p[0], p[2])))

        const width = box.max.x - box.min.x
        const height = box.max.y - box.min.y
        const centerX = (box.max.x + box.min.x) / 2
        const centerZ = (box.max.y + box.min.y) / 2

        // Resolution: vertices per meter
        const resolution = 4
        const segmentsW = Math.max(1, Math.ceil(width * resolution))
        const segmentsH = Math.max(1, Math.ceil(height * resolution))

        const geo = new THREE.PlaneGeometry(width, height, segmentsW, segmentsH)

        // Rotate and position to match the top face
        geo.rotateX(-Math.PI / 2)
        geo.translate(centerX, config.depth + 0.005, centerZ) // Closer to avoid "floating" look

        topOriginalPositionsRef.current = new Float32Array(geo.attributes.position.array)
        return geo
    }, [surface.points, config.depth, geometry?.shape])

    // 3. Create a mask geometry (simple shape) for the stencil
    const maskGeometry = useMemo(() => {
        if (!geometry?.shape) return null
        return new THREE.ShapeGeometry(geometry.shape)
    }, [geometry?.shape])

    // Displacement function
    const applyHeightmapDisplacement = useCallback(() => {
        const state = useInteriorStore.getState()
        const heightmap = state.terrainSettings.heightmap
        const materialMap = state.terrainSettings.materialMap
        const heightmapSize = state.terrainSettings.heightmapSize
        const baseGroundHeight = state.terrainSettings.baseGroundHeight

        const currentHeightmap = heightmap

        // Update Base Geometry (Sides)
        if (meshRef.current && originalPositionsRef.current) {
            const geo = meshRef.current.geometry
            const posAttribute = geo.attributes.position
            const original = originalPositionsRef.current

            for (let i = 0; i < posAttribute.count; i++) {
                const origX = original[i * 3]
                const origY = original[i * 3 + 1]
                const origZ = original[i * 3 + 2]

                const worldX = origX
                const worldZ = -origY

                const h = sampleHeightmap(worldX, worldZ, currentHeightmap, heightmapSize, baseGroundHeight)

                posAttribute.setXYZ(i, origX, origY, origZ + h)
            }
            posAttribute.needsUpdate = true
            geo.computeVertexNormals()
        }

        // Update Top Plane Geometry (High Res)
        if (topMeshRef.current && topOriginalPositionsRef.current) {
            const geo = topMeshRef.current.geometry
            const posAttribute = geo.attributes.position
            const original = topOriginalPositionsRef.current

            // Add or get color attribute
            let colorAttribute = geo.getAttribute('color') as THREE.BufferAttribute
            const groundColor = new THREE.Color(surface.texture ? 'white' : config.color)
            const waterColor = new THREE.Color('#06b6d4')

            if (!colorAttribute) {
                const colors = new Float32Array(posAttribute.count * 3)
                // Initialize with ground color
                for (let i = 0; i < posAttribute.count; i++) {
                    colors[i * 3] = groundColor.r
                    colors[i * 3 + 1] = groundColor.g
                    colors[i * 3 + 2] = groundColor.b
                }
                geo.setAttribute('color', new THREE.BufferAttribute(colors, 3))
                colorAttribute = geo.getAttribute('color') as THREE.BufferAttribute
            }

            for (let i = 0; i < posAttribute.count; i++) {
                const worldX = original[i * 3]
                const worldY = original[i * 3 + 1]
                const worldZ = original[i * 3 + 2]

                const h = sampleHeightmap(worldX, worldZ, currentHeightmap, heightmapSize, baseGroundHeight)
                posAttribute.setXYZ(i, worldX, worldY + h, worldZ)

                // Sample material
                const gridX = Math.floor((worldX + TERRAIN_WORLD_SIZE / 2) * (heightmapSize / TERRAIN_WORLD_SIZE))
                const gridZ = Math.floor((worldZ + TERRAIN_WORLD_SIZE / 2) * (heightmapSize / TERRAIN_WORLD_SIZE))
                let isWater = false
                if (materialMap && gridX >= 0 && gridX < heightmapSize && gridZ >= 0 && gridZ < heightmapSize) {
                    isWater = materialMap[gridZ * heightmapSize + gridX] === 1
                }

                const finalColor = isWater ? waterColor : groundColor
                colorAttribute.setXYZ(i, finalColor.r, finalColor.g, finalColor.b)
            }
            posAttribute.needsUpdate = true
            colorAttribute.needsUpdate = true
            geo.computeVertexNormals()
        }
    }, [config.depth, config.color, surface.texture])

    // Reactive updates
    useEffect(() => {
        applyHeightmapDisplacement()

        const unsubscribe = useInteriorStore.subscribe((state) => {
            // Apply whenever heightmap or materialMap changes
            applyHeightmapDisplacement()
        })
        return unsubscribe
    }, [applyHeightmapDisplacement])

    if (!baseGeometry) return null

    return (
        <group position={[0, config.verticalOffset, 0]} userData={{ id: surface.id }}>
            {/* 1. Stencil Mask: defines the polygon shape */}
            <mesh
                geometry={maskGeometry}
                rotation={[-Math.PI / 2, 0, 0]}
                position={[0, config.depth + 0.01, 0]} // Slightly above to avoid z-fighting
                renderOrder={0}
            >
                <meshBasicMaterial
                    colorWrite={false}
                    depthWrite={false}
                    depthTest={false}
                    stencilWrite={true}
                    stencilFunc={THREE.AlwaysStencilFunc}
                    stencilZPass={THREE.ReplaceStencilOp}
                    stencilRef={1}
                />
            </mesh>

            {/* 2. Sides & Bottom (Hide top face to allow hi-res plane to be the only top) */}
            <mesh
                ref={meshRef}
                geometry={baseGeometry}
                rotation={[Math.PI / 2, 0, 0]}
                onClick={onClick}
                receiveShadow
                castShadow
            >
                {/* Material array: [front/top, back/bottom, sides] */}
                <meshPhysicalMaterial
                    attach="material-0"
                    visible={false} // Hide the original top face!
                />
                <meshPhysicalMaterial
                    attach="material-1"
                    color={surface.texture ? 'white' : config.color}
                    map={textureMap}
                    opacity={(config.opacity || 1) * opacity}
                    transparent={true}
                />
                <meshPhysicalMaterial
                    attach="material-2"
                    color={surface.texture ? 'white' : config.color}
                    map={textureMap}
                    opacity={(config.opacity || 1) * opacity}
                    transparent={true}
                    side={THREE.DoubleSide}
                />
            </mesh>

            {/* 3. Subdivided Top Plane (Masked by Step 1) */}
            {topPlaneGeometry && (
                <mesh
                    ref={topMeshRef}
                    geometry={topPlaneGeometry}
                    renderOrder={1}
                    receiveShadow
                    castShadow
                >
                    <meshPhysicalMaterial
                        color="white" // Base color is white, modified by vertexColors
                        vertexColors={true}
                        map={textureMap}
                        metalness={surface.metalness ?? config.metalness}
                        roughness={surface.roughness ?? config.roughness}
                        transmission={config.transmission || 0}
                        opacity={(config.opacity || 1) * opacity}
                        transparent={true}
                        envMapIntensity={surface.texture ? 1.0 : 0.5}
                        side={THREE.DoubleSide}
                        stencilWrite={true}
                        stencilFunc={THREE.EqualStencilFunc}
                        stencilRef={1}
                    />
                </mesh>
            )}

            {isSelected && (
                <group>
                    {surface.points.map((p, i) => (
                        <mesh key={i} position={new THREE.Vector3(p[0], config.verticalOffset + (sampleHeightmap(p[0], p[2], useInteriorStore.getState().terrainSettings.heightmap, useInteriorStore.getState().terrainSettings.heightmapSize, useInteriorStore.getState().terrainSettings.baseGroundHeight)), p[2])} userData={{ isControlPoint: true, index: i, surfaceId: surface.id }}>
                            <sphereGeometry args={[0.2]} />
                            <meshBasicMaterial color="white" />
                        </mesh>
                    ))}
                </group>
            )}
        </group>
    )
}
