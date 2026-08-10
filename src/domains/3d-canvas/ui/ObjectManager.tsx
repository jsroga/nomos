/* eslint-disable react/no-unknown-property */
'use client'

import React, { useEffect, useMemo } from 'react'
import { ApiRoutePath } from '@/shared/data/constants/protocol'
import { MODEL_ERROR_LOG } from '@/domains/3d-canvas/constants/object-manager-messages'
import { useInteriorStore, SceneObject } from '@/domains/3d-canvas'
import { Box, useGLTF } from '@react-three/drei'
import * as THREE from 'three'
import { ObjectRendererContent } from './ObjectRendererContent'
import {
  computeAutoScale,
  shouldApplyAutoScale,
} from './utils/object-auto-scale'
import { buildUrl } from '@/shared/data/url-builder'

// Proxy external URLs to avoid CORS issues
const getProxiedUrl = (url: string): string => {
  if (url.startsWith('http://') || url.startsWith('https://')) {
    return buildUrl(ApiRoutePath.ProxyModel, { url })
  }
  return url
}

// Loading placeholder — mesh-only (avoid Html portal per instance)
const LoadingPlaceholder: React.FC = () => {
  return (
    <group>
      <Box args={[1, 1, 1]}>
        <meshStandardMaterial color="#4f46e5" wireframe opacity={0.5} transparent />
      </Box>
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
    console.error(MODEL_ERROR_LOG, error, errorInfo)
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
  onLoaded: () => void
  onDimensionsCalculated?: (dimensions: THREE.Vector3) => void
}> = ({ url, onLoaded, onDimensionsCalculated }) => {
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
  const updateObject = useInteriorStore(state => state.updateObject)
  const effectiveModelUrl = obj.modelUrl

  const handleLoaded = () => {
    if (obj.isLoading) {
      updateObject(obj.id, { isLoading: false })
    }
  }

  const handleDimensionsCalculated = (naturalSize: THREE.Vector3) => {
    if (!shouldApplyAutoScale(obj)) return

    const newScale = computeAutoScale(naturalSize, obj.targetDimensions)

    console.log(`[Auto-Scale] ${obj.id}`, {
      natural: naturalSize,
      target: obj.targetDimensions,
      newScale,
    })

    updateObject(obj.id, {
      scale: newScale,
      targetDimensions: undefined,
    })
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
      <ObjectRendererContent
        obj={obj}
        effectiveModelUrl={effectiveModelUrl}
        isSelected={isSelected}
        opacity={opacity}
        onLoaded={handleLoaded}
        onDimensionsCalculated={handleDimensionsCalculated}
        LoadingPlaceholder={LoadingPlaceholder}
        GLBModel={GLBModel}
        ModelErrorBoundary={ModelErrorBoundary}
      />
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
