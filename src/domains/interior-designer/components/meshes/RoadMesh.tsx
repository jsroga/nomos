import * as THREE from 'three'
import React, { useMemo } from 'react'
import { Surface } from '@/domains/interior-designer/store/useInteriorStore'
import { useLoader } from '@react-three/fiber'

interface RoadMeshProps {
    surface: Surface
    config: {
        width?: number
        depth: number
        verticalOffset: number
        color: string
        roughness: number
        metalness: number
    }
    isSelected: boolean
    onClick: (e: any) => void
}

export const RoadMesh: React.FC<RoadMeshProps> = ({ surface, config, isSelected, onClick }) => {

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
            ? new THREE.CatmullRomCurve3(curvePoints, isClosed, 'catmullrom', tension)
            : new THREE.CatmullRomCurve3(curvePoints, isClosed, 'catmullrom', 0)

        // Shape Generation
        const shape = new THREE.Shape()

        if (surface.isVertical) {
            // Wall Mode: Extruded Vertically
            // Based on Road behavior (X=Up, Y=Sideways), we need to swap dimensions.

            const thickness = surface.width || 0.5
            const height = surface.height || 3

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
        const steps = Math.max(50, Math.ceil(length * 5))

        const extrudeSettings = {
            steps: steps,
            extrudePath: curve,
            bevelEnabled: false,
        }

        return new THREE.ExtrudeGeometry(shape, extrudeSettings)

    }, [surface.points, surface.curved, surface.width, surface.height, surface.isVertical, surface.roundness, config.width, config.depth])

    // Load Texture
    const textureMap = useMemo(() => {
        if (!surface.texture) return null
        const tex = new THREE.TextureLoader().load(surface.texture)
        tex.wrapS = THREE.RepeatWrapping
        tex.wrapT = THREE.RepeatWrapping

        // Important: For our ribbon UVs, we control V scale via geometry generation (based on length).
        // But U scale (width) might need adjustment.
        // And we might want to scale the whole thing.
        // If we set repeat here, it multiplies our UVs.
        const scale = surface.textureScale ?? 1
        tex.repeat.set(1, scale) // Scale V only? Or both? Usually road textures tile along length.
        return tex
    }, [surface.texture, surface.textureScale])

    if (!geometry) return null

    return (
        <group position={[0, config.verticalOffset, 0]}>
            <mesh
                geometry={geometry}
                onClick={onClick}
                castShadow
                receiveShadow
            >
                <meshStandardMaterial
                    color={surface.texture ? 'white' : config.color}
                    map={surface.texture ? textureMap : null}
                    metalness={surface.metalness ?? config.metalness}
                    roughness={surface.roughness ?? config.roughness}
                    side={THREE.DoubleSide}
                />
            </mesh>

            {isSelected && (
                <mesh geometry={geometry} position={[0, 0.005, 0]}>
                    <meshBasicMaterial color="white" wireframe transparent opacity={0.3} />
                </mesh>
            )}
        </group>
    )
}
