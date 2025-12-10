'use client'

import React, { Suspense, useState, useEffect } from 'react'
import { Loader2, AlertCircle, ExternalLink } from 'lucide-react'

// Lazy load Three.js components to avoid SSR issues
let Canvas: any = null
let OrbitControls: any = null
let useGLTF: any = null
let Center: any = null
let Environment: any = null
let useBounds: any = null
let Bounds: any = null
let Html: any = null

interface ThreeDViewerProps {
  modelUrl: string
}

// Proxy external URLs to avoid CORS issues
const getProxiedUrl = (url: string): string => {
  if (url.startsWith('http://') || url.startsWith('https://')) {
    return `/api/proxy-model?url=${encodeURIComponent(url)}`
  }
  return url
}

// Loading spinner shown inside the 3D canvas
const CanvasLoader: React.FC = () => {
  if (!Html) return null

  return (
    <Html center>
      <div className="flex flex-col items-center gap-2">
        <Loader2 className="animate-spin text-white" size={32} />
        <span className="text-white text-sm">Loading 3D model...</span>
      </div>
    </Html>
  )
}

const ModelLoader: React.FC<{ url: string; onLoaded?: () => void }> = ({ url, onLoaded }) => {
  if (!useGLTF || !Center) return null

  const proxiedUrl = getProxiedUrl(url)

  // useGLTF suspends during loading - don't wrap in try/catch
  const { scene } = useGLTF(proxiedUrl)

  // Clone the scene to avoid issues with reuse
  const clonedScene = React.useMemo(() => scene.clone(), [scene])

  // Call onLoaded when model is ready
  useEffect(() => {
    if (scene && onLoaded) {
      onLoaded()
    }
  }, [scene, onLoaded])

  return (
    <Center>
      <primitive object={clonedScene} />
    </Center>
  )
}

// Component to auto-fit camera to model bounds
const FitToView: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  if (!Bounds || !useBounds) return <>{children}</>

  return (
    <Bounds fit clip observe margin={1.5}>
      <SelectToZoom>{children}</SelectToZoom>
    </Bounds>
  )
}

// Helper to zoom on click (optional)
const SelectToZoom: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  if (!useBounds) return <>{children}</>

  const bounds = useBounds()

  return (
    <group
      onClick={(e: any) => {
        e.stopPropagation()
        bounds.refresh().fit()
      }}
    >
      {children}
    </group>
  )
}

export const ThreeDViewer: React.FC<ThreeDViewerProps> = ({ modelUrl }) => {
  const [isLibsLoaded, setIsLibsLoaded] = useState(false)
  const [isModelLoaded, setIsModelLoaded] = useState(false)
  const [hasError, setHasError] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')

  useEffect(() => {
    const loadThree = async () => {
      try {
        const [fiberModule, dreiModule] = await Promise.all([
          import('@react-three/fiber'),
          import('@react-three/drei'),
        ])

        Canvas = fiberModule.Canvas
        OrbitControls = dreiModule.OrbitControls
        useGLTF = dreiModule.useGLTF
        Center = dreiModule.Center
        Environment = dreiModule.Environment
        Bounds = dreiModule.Bounds
        useBounds = dreiModule.useBounds
        Html = dreiModule.Html

        setIsLibsLoaded(true)
      } catch (err: any) {
        console.error('Failed to load Three.js:', err)
        setHasError(true)
        setErrorMessage(err.message || 'Failed to load 3D viewer')
      }
    }

    loadThree()
  }, [])

  // Reset model loaded state when URL changes
  useEffect(() => {
    setIsModelLoaded(false)
  }, [modelUrl])

  // Cleanup GLTF cache when component unmounts or URL changes
  useEffect(() => {
    return () => {
      if (useGLTF?.clear) {
        const proxiedUrl = getProxiedUrl(modelUrl)
        useGLTF.clear(proxiedUrl)
      }
    }
  }, [modelUrl])

  if (hasError) {
    return (
      <div className="w-full h-full bg-[#1a1a1a] flex flex-col items-center justify-center text-muted-foreground p-4">
        <AlertCircle size={32} className="mb-2 text-destructive" />
        <p className="text-sm mb-2">3D Viewer failed to load</p>
        <p className="text-xs text-center mb-4">{errorMessage}</p>
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

  if (!isLibsLoaded || !Canvas) {
    return (
      <div className="w-full h-full bg-[#1a1a1a] flex flex-col items-center justify-center">
        <Loader2 className="animate-spin text-muted-foreground" size={32} />
        <span className="text-muted-foreground text-sm mt-2">Loading viewer...</span>
      </div>
    )
  }

  return (
    <div className="w-full h-full bg-[#1a1a1a] relative">
      <ErrorBoundary
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
          dpr={[1, 1.5]} // Lower max DPR to reduce memory usage
          camera={{ position: [0, 0, 5], fov: 50 }}
          style={{ background: '#1a1a1a', width: '100%', height: '100%' }}
          resize={{ scroll: false, debounce: { scroll: 50, resize: 0 } }}
          frameloop="always" // Keep rendering for auto-rotate
          gl={{
            antialias: true,
            alpha: false,
            powerPreference: 'high-performance',
            preserveDrawingBuffer: false,
          }}
          onCreated={({ gl }) => {
            // Handle context loss
            gl.domElement.addEventListener('webglcontextlost', (e) => {
              e.preventDefault()
              console.warn('WebGL context lost')
            })
            gl.domElement.addEventListener('webglcontextrestored', () => {
              console.log('WebGL context restored')
            })
          }}
        >
          {/* Lighting */}
          <ambientLight intensity={0.5} />
          <directionalLight position={[10, 10, 5]} intensity={1} castShadow />
          <directionalLight position={[-10, -10, -5]} intensity={0.3} />

          {/* Environment for reflections */}
          <Suspense fallback={null}>
            {Environment && <Environment preset="city" />}
          </Suspense>

          {/* Model with auto-fit bounds */}
          <Suspense fallback={<CanvasLoader />}>
            <FitToView>
              <ModelLoader
                url={modelUrl}
                onLoaded={() => setIsModelLoaded(true)}
              />
            </FitToView>
          </Suspense>

          {/* Controls - makeDefault triggers re-render on interaction */}
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

// Simple error boundary
class ErrorBoundary extends React.Component<
  { children: React.ReactNode; fallback: React.ReactNode },
  { hasError: boolean }
> {
  constructor(props: any) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError() {
    return { hasError: true }
  }

  componentDidCatch(error: any, errorInfo: any) {
    console.error('ThreeDViewer error:', error, errorInfo)
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback
    }
    return this.props.children
  }
}
