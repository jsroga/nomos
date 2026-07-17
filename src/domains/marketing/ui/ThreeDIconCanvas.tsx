'use client'

import React from 'react'
import { Canvas } from '@react-three/fiber'
import { IconScene } from './three-d-icon/IconScene'
import {
  MousePositionContext,
  MouseRotationGroup,
  ScaleContext,
} from './three-d-icon/three-d-icon-contexts'

interface ThreeDIconCanvasProps {
  type: string
  scale: number
  offset: [number, number]
  density?: number
  glowScale?: number
  mouseRotation?: number
  distortion?: number
  speed?: number
  frequency?: number
  contrast?: number
  twist?: number
  metalness?: number
  mousePosition: React.RefObject<{ x: number; y: number }>
}

export function ThreeDIconCanvas({
  type,
  scale,
  offset,
  density,
  glowScale,
  distortion,
  speed,
  mouseRotation,
  frequency,
  contrast,
  twist,
  metalness,
  mousePosition,
}: ThreeDIconCanvasProps) {
  return (
    <Canvas
      camera={{ position: [0, 0, 1.1], fov: 50 }}
      style={{ background: 'transparent' }}
      gl={{ alpha: true, antialias: false, powerPreference: 'high-performance' }}
      dpr={1}
      frameloop="always"
    >
      <ambientLight intensity={0.5} />
      <directionalLight position={[2, 2, 2]} intensity={1} />
      <React.Suspense fallback={null}>
        <ScaleContext.Provider value={scale}>
          <MousePositionContext.Provider value={mousePosition}>
            <MouseRotationGroup intensity={mouseRotation}>
              <group position={[offset[0], offset[1], 0]}>
                <IconScene
                  type={type}
                  density={density}
                  glowScale={glowScale}
                  distortion={distortion}
                  speed={speed}
                  frequency={frequency}
                  contrast={contrast}
                  twist={twist}
                  metalness={metalness}
                  scale={scale}
                />
              </group>
            </MouseRotationGroup>
          </MousePositionContext.Provider>
        </ScaleContext.Provider>
      </React.Suspense>
    </Canvas>
  )
}
