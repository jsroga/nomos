/* eslint-disable react/no-unknown-property */
'use client'

import React, { Suspense, useState, useEffect, useMemo } from 'react'
import { useInteriorStore, SceneObject } from '@/domains/interior-designer/store/useInteriorStore'
import { Box, Sphere, useGLTF, Html } from '@react-three/drei'
import { Loader2 } from 'lucide-react'
import * as THREE from 'three'
import { WindowMesh } from './meshes/WindowMesh'
import { DoorMesh } from './meshes/DoorMesh'

// Proxy external URLs to avoid CORS issues
const getProxiedUrl = (url: string): string => {
  if (url.startsWith('http://') || url.startsWith('https://')) {
    return `/api/proxy-model?url=${encodeURIComponent(url)}`
  }
  return url
}

// Loading placeholder component
const LoadingPlaceholder: React.FC<{ thumbnailUrl?: string }> = ({ thumbnailUrl }) => {
  return (
    <group>
      <Box args={[1, 1, 1]}>
        <meshStandardMaterial color="#4f46e5" wireframe opacity={0.5} transparent />
      </Box>
      <Html center>
        <div className="flex flex-col items-center gap-1 bg-black/80 px-2 py-1 rounded text-white">
          <Loader2 className="animate-spin" size={16} />
          <span className="text-[10px]">Loading...</span>
        </div>
      </Html>
    </group>
  )
}

// Custom Error Boundary for 3D Models
class ModelErrorBoundary extends React.Component<
  { children: React.ReactNode; fallback: React.ReactNode },
  { hasError: boolean }
> {
  constructor(props: { children: React.ReactNode; fallback: React.ReactNode }) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError() {
    return { hasError: true }
  }

  componentDidCatch(error: unknown, errorInfo: React.ErrorInfo) {
    console.error('Model Error:', error, errorInfo)
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback
    }
    return this.props.children
  }
}

// GLB Model loader component
const GLBModel: React.FC<{
  url: string
  isSelected: boolean
  onLoaded: () => void
  onDimensionsCalculated?: (dimensions: THREE.Vector3) => void
}> = ({ url, isSelected, onLoaded, onDimensionsCalculated }) => {
  const proxiedUrl = getProxiedUrl(url)
  // useGLTF suspends automatically. We rely on Suspense parent.
  const { scene } = useGLTF(proxiedUrl)

  // Calculate dimensions once when scene loads
  const { clonedScene, naturalSize } = useMemo(() => {
    const clone = scene.clone()

    // Auto-Fix Pivot: Center X/Z and Floor Y
    const box = new THREE.Box3().setFromObject(clone)
    const center = new THREE.Vector3()
    const size = new THREE.Vector3()
    box.getCenter(center)
    box.getSize(size)

    // Shift geometry so pivot is at bottom-center
    clone.position.x += clone.position.x - center.x
    clone.position.z += clone.position.z - center.z
    clone.position.y += clone.position.y - box.min.y

    return { clonedScene: clone, naturalSize: size }
  }, [scene])

  // Notify parent of natural dimensions AFTER render (avoids state update during render)
  useEffect(() => {
    if (onDimensionsCalculated && naturalSize) {
      onDimensionsCalculated(naturalSize)
    }
  }, [naturalSize, onDimensionsCalculated])

  useEffect(() => {
    onLoaded()
  }, [onLoaded])

  return <primitive object={clonedScene} />
}

// Individual object renderer
const ObjectRenderer: React.FC<{
  obj: SceneObject
  isSelected: boolean
  onClick: () => void
  opacity?: number
}> = ({ obj, isSelected, onClick, opacity = 1 }) => {
  const [isLoaded, setIsLoaded] = useState(false)
  const updateObject = useInteriorStore(state => state.updateObject)

  // Retexture Preview is now handled by updating obj.modelUrl directly in the store
  // const pendingRetextureUrl = useInteriorStore(state => state.pendingRetextureUrl)
  // const isRetexturing = useInteriorStore(state => state.isRetexturing)
  const selectedId = useInteriorStore(state => state.selectedId)

  // Determine effective URL
  const effectiveModelUrl = obj.modelUrl

  const isPrimitive = [
    'cube',
    'sphere',
    'cylinder',
    'cone',
    'building',
    'tree',
    'window',
    'door',
  ].includes(effectiveModelUrl)
  const isExternalModel =
    effectiveModelUrl.startsWith('http://') ||
    effectiveModelUrl.startsWith('https://') ||
    effectiveModelUrl.startsWith('data:')

  const handleLoaded = () => {
    setIsLoaded(true)
    if (obj.isLoading) {
      updateObject(obj.id, { isLoading: false })
    }
  }

  const handleDimensionsCalculated = (naturalSize: THREE.Vector3) => {
    // If we have target dimensions, apply auto-scaling
    if (obj.targetDimensions) {
      const [targetX, targetY, targetZ] = obj.targetDimensions

      // Prevent division by zero
      const scaleX = naturalSize.x > 0.01 ? targetX / naturalSize.x : 1
      const scaleY = naturalSize.y > 0.01 ? targetY / naturalSize.y : 1
      const scaleZ = naturalSize.z > 0.01 ? targetZ / naturalSize.z : 1

      console.log(`[Auto-Scale] ${obj.id}`, {
        natural: naturalSize,
        target: obj.targetDimensions,
        newScale: [scaleX, scaleY, scaleZ],
      })

      // Apply new scale and clear targetDimensions to prevent re-loop
      updateObject(obj.id, {
        scale: [scaleX, scaleY, scaleZ],
        targetDimensions: undefined,
      })
    }
  }

  return (
    <group
      name={obj.id}
      position={obj.position}
      rotation={obj.rotation}
      scale={obj.scale}
      onClick={e => {
        e.stopPropagation()
        onClick()
      }}
    >
      {/* Primitives */}
      {effectiveModelUrl === 'cube' && (
        <mesh position={[0, 0.5, 0]}>
          <boxGeometry args={[1, 1, 1]} />
          <meshStandardMaterial color={isSelected ? '#4f46e5' : '#f59e0b'} />
        </mesh>
      )}
      {effectiveModelUrl === 'sphere' && (
        <mesh position={[0, 0.5, 0]}>
          <sphereGeometry args={[0.5, 32, 32]} />
          <meshStandardMaterial color={isSelected ? '#4f46e5' : '#10b981'} />
        </mesh>
      )}
      {effectiveModelUrl === 'cylinder' && (
        <mesh position={[0, 0.5, 0]}>
          <cylinderGeometry args={[0.5, 0.5, 1]} />
          <meshStandardMaterial color={isSelected ? '#4f46e5' : '#ec4899'} />
        </mesh>
      )}
      {effectiveModelUrl === 'cone' && (
        <mesh position={[0, 0.5, 0]}>
          <coneGeometry args={[0.5, 1]} />
          <meshStandardMaterial color={isSelected ? '#4f46e5' : '#8b5cf6'} />
        </mesh>
      )}

      {/* Demo Assets Placeholders */}
      {effectiveModelUrl === 'building' && (
        <group>
          {/* Main Building Body */}
          <Box args={[2, 4, 2]} position={[0, 2, 0]}>
            <meshStandardMaterial color={isSelected ? '#4f46e5' : '#71717a'} />
          </Box>
          {/* Roof */}
          <mesh position={[0, 4.5, 0]} rotation={[0, Math.PI / 4, 0]}>
            <coneGeometry args={[1.5, 1, 4]} />
            <meshStandardMaterial color="#3f3f46" />
          </mesh>
        </group>
      )}
      {effectiveModelUrl === 'tree' && (
        <group>
          {/* Trunk */}
          <mesh position={[0, 0.5, 0]}>
            <cylinderGeometry args={[0.2, 0.3, 1]} />
            <meshStandardMaterial color="#78350f" />
          </mesh>
          {/* Leaves */}
          <mesh position={[0, 1.5, 0]}>
            <coneGeometry args={[1, 2]} />
            <meshStandardMaterial color={isSelected ? '#4f46e5' : '#166534'} />
          </mesh>
          <mesh position={[0, 2.5, 0]}>
            <coneGeometry args={[0.8, 1.5]} />
            <meshStandardMaterial color={isSelected ? '#4f46e5' : '#166534'} />
          </mesh>
          <mesh position={[0, 2.5, 0]}>
            <coneGeometry args={[0.8, 1.5]} />
            <meshStandardMaterial color={isSelected ? '#4f46e5' : '#166534'} />
          </mesh>
        </group>
      )}

      {effectiveModelUrl === 'window' && (
        <WindowMesh color={obj.color || '#7a6f5e'} isSelected={isSelected} opacity={opacity} />
      )}
      {effectiveModelUrl === 'door' && (
        <DoorMesh color={obj.color || '#7a6f5e'} isSelected={isSelected} opacity={opacity} />
      )}

      {/* External GLB Models */}
      {isExternalModel && (
        <ModelErrorBoundary
          fallback={
            <Box args={[1, 1, 1]}>
              <meshStandardMaterial color="#ef4444" />
            </Box>
          }
        >
          <Suspense fallback={<LoadingPlaceholder thumbnailUrl={obj.thumbnailUrl} />}>
            <GLBModel
              url={effectiveModelUrl}
              isSelected={isSelected}
              onLoaded={handleLoaded}
              onDimensionsCalculated={handleDimensionsCalculated}
            />
          </Suspense>
        </ModelErrorBoundary>
      )}
    </group>
  )
}

export const ObjectManager: React.FC = () => {
  const objects = useInteriorStore(state => state.objects)
  const selectedId = useInteriorStore(state => state.selectedId)
  const setSelected = useInteriorStore(state => state.setSelected)
  const mode = useInteriorStore(state => state.mode)
  const activeLevel = useInteriorStore(state => state.activeLevel)

  return (
    <group>
      {objects.map(obj => {
        const objectLevel = obj.level ?? 0
        const isOnActiveLevel = objectLevel === activeLevel
        return (
          <group key={obj.id} position={[0, objectLevel * 3, 0]}>
            <ObjectRenderer
              obj={obj}
              isSelected={obj.id === selectedId}
              onClick={() => {
                if (mode === 'SELECT') {
                  setSelected(obj.id)
                }
              }}
              opacity={isOnActiveLevel ? 1 : 0.3}
            />
          </group>
        )
      })}
    </group>
  )
}
