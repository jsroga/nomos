'use client'

import React, { Suspense, useState, useEffect, type ReactNode } from 'react'
import { Canvas, type ThreeEvent } from '@react-three/fiber'
import { buildUrl } from '@/shared/data/url-builder'
import { ApiRoutePath } from '@/shared/data/constants/protocol'
import {
  OrbitControls,
  useGLTF,
  Center,
  Environment,
  Bounds,
  useBounds,
  Html,
} from '@react-three/drei'
import { Loader2, AlertCircle, ExternalLink } from 'lucide-react'
import {
  THREE_D_VIEWER_ERROR_LOG,
  THREE_D_VIEWER_LOAD_ERROR,
} from '@/domains/3d-asset-exporter/constants/three-d-viewer-messages'

interface ThreeDViewerProps {
  modelUrl: string
}

const getProxiedUrl = (url: string): string => {
  if (url.startsWith('http://') || url.startsWith('https://')) {
    return buildUrl(ApiRoutePath.ProxyModel, { url })
  }
  return url
}

const CanvasLoader: React.FC = () => (
  <Html center>
    <div className="flex flex-col items-center gap-2">
      <Loader2 className="animate-spin text-white" size={32} />
      <span className="text-white text-sm">Loading 3D model...</span>
    </div>
  </Html>
)

const ModelLoader: React.FC<{ url: string; onLoaded?: () => void }> = ({ url, onLoaded }) => {
  const proxiedUrl = getProxiedUrl(url)
  const { scene } = useGLTF(proxiedUrl)
  const clonedScene = React.useMemo(() => scene.clone(), [scene])

  useEffect(() => {
    onLoaded?.()
  }, [onLoaded])

  return (
    <Center>
      <primitive object={clonedScene} />
    </Center>
  )
}

const FitToView: React.FC<{ children: ReactNode }> = ({ children }) => (
  <Bounds fit clip observe margin={1.5}>
    <SelectToZoom>{children}</SelectToZoom>
  </Bounds>
)

const SelectToZoom: React.FC<{ children: ReactNode }> = ({ children }) => {
  const bounds = useBounds()

  return (
    <group
      onClick={(e: ThreeEvent<MouseEvent>) => {
        e.stopPropagation()
        bounds.refresh().fit()
      }}
    >
      {children}
    </group>
  )
}

export const ThreeDViewer: React.FC<ThreeDViewerProps> = ({ modelUrl }) => {
  const [, setIsModelLoaded] = useState(false)
  const [hasError, setHasError] = useState(false)

  useEffect(() => {
    setIsModelLoaded(false)
  }, [modelUrl])

  useEffect(() => {
    return () => {
      useGLTF.clear(getProxiedUrl(modelUrl))
    }
  }, [modelUrl])

  if (hasError) {
    return (
      <div className="w-full h-full bg-[#1a1a1a] flex flex-col items-center justify-center text-muted-foreground p-4">
        <AlertCircle size={32} className="mb-2 text-destructive" />
        <p className="text-sm mb-2">3D Viewer failed to load</p>
        <p className="text-xs text-center mb-4">{THREE_D_VIEWER_LOAD_ERROR}</p>
        <a
          href={modelUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1 text-xs text-primary hover:underline"
        >
          <ExternalLink size={12} />
          Download model directly
        </a>
      </div>
    )
  }

  return (
    <div className="w-full h-full bg-[#1a1a1a] relative">
      <ErrorBoundary
        onError={() => setHasError(true)}
        fallback={
          <div className="w-full h-full flex flex-col items-center justify-center text-muted-foreground p-4">
            <AlertCircle size={32} className="mb-2 text-destructive" />
            <p className="text-sm mb-4">3D rendering error</p>
            <a
              href={getProxiedUrl(modelUrl)}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 text-xs text-primary hover:underline"
            >
              <ExternalLink size={12} />
              Download model directly
            </a>
          </div>
        }
      >
        <Canvas
          shadows
          dpr={[1, 1.5]}
          camera={{ position: [0, 0, 5], fov: 50 }}
          style={{ background: '#1a1a1a', width: '100%', height: '100%' }}
          resize={{ scroll: false, debounce: { scroll: 50, resize: 0 } }}
          frameloop="always"
          gl={{
            antialias: true,
            alpha: false,
            powerPreference: 'high-performance',
            preserveDrawingBuffer: false,
          }}
          onCreated={({ gl }) => {
            gl.domElement.addEventListener('webglcontextlost', (e: Event) => {
              e.preventDefault()
              console.warn('WebGL context lost')
            })
            gl.domElement.addEventListener('webglcontextrestored', () => {
              console.log('WebGL context restored')
            })
          }}
        >
          <ambientLight intensity={0.5} />
          <directionalLight position={[10, 10, 5]} intensity={1} castShadow />
          <directionalLight position={[-10, -10, -5]} intensity={0.3} />

          <Suspense fallback={null}>
            <Environment preset="city" />
          </Suspense>

          <Suspense fallback={<CanvasLoader />}>
            <FitToView>
              <ModelLoader url={modelUrl} onLoaded={() => setIsModelLoaded(true)} />
            </FitToView>
          </Suspense>

          <OrbitControls
            makeDefault
            autoRotate={false}
            autoRotateSpeed={2}
            enablePan={true}
            enableZoom={true}
            enableRotate={true}
            minDistance={0.5}
            maxDistance={100}
          />
        </Canvas>
      </ErrorBoundary>
    </div>
  )
}

class ErrorBoundary extends React.Component<
  { children: React.ReactNode; fallback: React.ReactNode; onError?: () => void },
  { hasError: boolean }
> {
  constructor(props: { children: React.ReactNode; fallback: React.ReactNode; onError?: () => void }) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError() {
    return { hasError: true }
  }

  componentDidCatch(error: unknown, errorInfo: React.ErrorInfo) {
    console.error(THREE_D_VIEWER_ERROR_LOG, error, errorInfo)
    this.props.onError?.()
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback
    }
    return this.props.children
  }
}
