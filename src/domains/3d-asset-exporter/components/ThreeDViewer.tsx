import React, { Suspense } from 'react'
import { Canvas } from '@react-three/fiber'
import { OrbitControls, useGLTF, Stage } from '@react-three/drei'

interface ThreeDViewerProps {
  modelUrl: string
}

const Model: React.FC<{ url: string }> = ({ url }) => {
  const { scene } = useGLTF(url)
  return <primitive object={scene} />
}

export const ThreeDViewer: React.FC<ThreeDViewerProps> = ({ modelUrl }) => {
  return (
    <div className="w-full h-full bg-[#1a1a1a]">
      <Canvas shadows dpr={[1, 2]} camera={{ fov: 50 }}>
        <Suspense fallback={null}>
          <Stage environment="city" intensity={0.6}>
            <Model url={modelUrl} />
          </Stage>
        </Suspense>
        <OrbitControls autoRotate />
      </Canvas>
    </div>
  )
}

