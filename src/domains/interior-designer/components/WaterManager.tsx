/* eslint-disable react/no-unknown-property */
'use client'

import React, { useMemo } from 'react'
import { useInteriorStore } from '@/domains/interior-designer/store/useInteriorStore'
import * as THREE from 'three'
import { Extrude } from '@react-three/drei'

export const WaterManager: React.FC = () => {
    const water = useInteriorStore(state => state.water)
    const activeLevel = useInteriorStore(state => state.activeLevel)
    const removeWater = useInteriorStore(state => state.removeWater)
    const mode = useInteriorStore(state => state.mode)
    const selectedId = useInteriorStore(state => state.selectedId)
    const setSelected = useInteriorStore(state => state.setSelected)

    return (
        <group position={[0, activeLevel * 3, 0]}>
            {water.map(w => (
                <WaterMesh
                    key={w.id}
                    id={w.id}
                    points={w.points}
                    y={w.y}
                    isSelected={w.id === selectedId}
                    onClick={(e) => {
                        e.stopPropagation()
                        if (mode === 'SELECT') {
                            setSelected(w.id)
                        }
                        if (mode === 'WATER' && e.altKey) {
                            removeWater(w.id)
                        }
                    }}
                />
            ))}
        </group>
    )
}

interface WaterMeshProps {
    id: string
    points: [number, number, number][]
    y: number
    isSelected?: boolean
    onClick?: (e: any) => void
}

const WaterMesh: React.FC<WaterMeshProps> = ({ id, points, y, isSelected, onClick }) => {
    const shape = useMemo(() => {
        const s = new THREE.Shape()
        if (points.length < 3) return s

        s.moveTo(points[0][0], points[0][2])
        for (let i = 1; i < points.length; i++) {
            s.lineTo(points[i][0], points[i][2])
        }
        s.lineTo(points[0][0], points[0][2])
        return s
    }, [points])

    return (
        <group position={[0, y, 0]}>
            <Extrude
                args={[shape, { depth: 0.5, bevelEnabled: false }]}
                rotation={[Math.PI / 2, 0, 0]}
                onClick={onClick}
            >
                {/* Water Material */}
                <meshPhysicalMaterial
                    color="#06b6d4"
                    transmission={0.9} // Glass-like transmission
                    opacity={0.8}
                    transparent
                    roughness={0.2}
                    metalness={0.1}
                    ior={1.33} // Water index of refraction
                    thickness={1.0}
                    emissive="#0891b2"
                    emissiveIntensity={0.2}
                />
            </Extrude>

            {/* Selection Highlight */}
            {isSelected && (
                <line position={[0, 0.51, 0]}>
                    <bufferGeometry>
                        <float32BufferAttribute
                            attach="attributes-position"
                            count={points.length + 1}
                            array={new Float32Array([...points.flat(), ...points[0]])}
                            itemSize={3}
                        />
                    </bufferGeometry>
                    <lineBasicMaterial color="white" linewidth={2} />
                </line>
            )}
        </group>
    )
}
