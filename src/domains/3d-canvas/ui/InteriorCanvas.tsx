/* eslint-disable react/no-unknown-property */
'use client'

import React, { useEffect, useMemo, useState } from 'react'
import { Canvas } from '@react-three/fiber'
import { OrbitControls, Grid, OrthographicCamera } from '@react-three/drei'
import { EffectComposer, Bloom, Noise, Vignette } from '@react-three/postprocessing'
import { WallManager } from './WallManager'
import { WallTool } from './tools/WallTool'
import { FloorManager } from './FloorManager'
import { SurfaceManager } from './SurfaceManager'
import { SurfaceTool } from './tools/SurfaceTool'
import { ObjectManager } from './ObjectManager'
import { ObjectTool } from './tools/ObjectTool'
import { ScatterTool } from './tools/ScatterTool'
import { TransformManager } from './TransformManager'
import { Exporter } from './Exporter'
import { RetextureExporter } from './RetextureExporter'
import { CameraController } from './CameraController'
import { KeybindingManager } from './KeybindingManager'
import { GlobalWaterPlane, TerrainBrushPreview } from './terrain'
import { TerrainTool } from './tools/TerrainTool'
import { CanvasPerfHud } from './perf/CanvasPerfHud'
import { useInteriorStore } from '@/domains/3d-canvas'
import {
  CanvasFrameloopMode,
  DocumentVisibilityStateValue,
  DomVisibilityEvent,
} from '@/domains/3d-canvas/constants/render-quality'
import { resolveEffectiveRenderConfig } from '@/domains/3d-canvas/core/render-quality'

const SunLight: React.FC<{
  shadowsEnabled: boolean
  shadowMapSize: number
}> = ({ shadowsEnabled, shadowMapSize }) => {
  const sunAngle = useInteriorStore(state => state.terrainSettings.sunAngle)

  const radians = (sunAngle * Math.PI) / 180
  const distance = 20
  const x = Math.cos(radians) * distance
  const z = Math.sin(radians) * distance

  return (
    <directionalLight
      position={[x, 20, z]}
      intensity={1.8}
      castShadow={shadowsEnabled}
      shadow-mapSize={shadowsEnabled ? [shadowMapSize, shadowMapSize] : [512, 512]}
      shadow-camera-left={-40}
      shadow-camera-right={40}
      shadow-camera-top={40}
      shadow-camera-bottom={-40}
      shadow-camera-far={100}
      shadow-bias={-0.0001}
    />
  )
}

function useCanvasFrameloop(): CanvasFrameloopMode {
  const [frameloop, setFrameloop] = useState<CanvasFrameloopMode>(CanvasFrameloopMode.Always)

  useEffect(() => {
    const sync = () => {
      setFrameloop(
        document.visibilityState === DocumentVisibilityStateValue.Hidden
          ? CanvasFrameloopMode.Never
          : CanvasFrameloopMode.Always
      )
    }
    sync()
    document.addEventListener(DomVisibilityEvent.VisibilityChange, sync)
    return () => document.removeEventListener(DomVisibilityEvent.VisibilityChange, sync)
  }, [])

  return frameloop
}

export const InteriorCanvas: React.FC = () => {
  const frameloop = useCanvasFrameloop()
  const renderQuality = useInteriorStore(state => state.renderQuality)
  const interactionActive = useInteriorStore(state => state.interactionActive)
  const setInteractionActive = useInteriorStore(state => state.setInteractionActive)

  const effective = useMemo(
    () => resolveEffectiveRenderConfig(renderQuality, interactionActive),
    [renderQuality, interactionActive]
  )

  const markInteractStart = () => {
    setInteractionActive(true)
  }
  const markInteractEnd = () => {
    setInteractionActive(false)
  }

  return (
    <Canvas
      shadows={effective.shadowsEnabled}
      className="w-full h-full"
      dpr={effective.dpr}
      frameloop={frameloop}
      gl={{
        stencil: true,
        powerPreference: 'high-performance',
        antialias: true,
      }}
    >
      <color attach="background" args={['#1e1e1e']} />

      <OrthographicCamera
        makeDefault
        position={[20, 20, 20]}
        zoom={60}
        near={-100}
        far={300}
        onUpdate={c => c.lookAt(0, 0, 0)}
      />

      <ambientLight intensity={0.3} />
      <SunLight
        shadowsEnabled={effective.shadowsEnabled}
        shadowMapSize={effective.shadowMapSize}
      />

      <pointLight position={[-10, 10, -10]} intensity={0.4} color="#ffffff" />

      <OrbitControls
        makeDefault
        enableRotate={true}
        enableZoom={true}
        minZoom={10}
        maxZoom={100}
        onStart={markInteractStart}
        onEnd={markInteractEnd}
      />

      <WallManager />
      <WallTool />
      <FloorManager />

      <SurfaceManager />
      <SurfaceTool />

      <ObjectManager />
      <ObjectTool />
      <ScatterTool />
      <TransformManager />

      <TerrainBrushPreview />
      <TerrainTool />
      <GlobalWaterPlane />

      <Exporter />
      <RetextureExporter />
      <CameraController />
      <KeybindingManager />
      <CanvasPerfHud />

      <Grid
        infiniteGrid
        cellSize={1}
        sectionSize={5}
        fadeDistance={100}
        cellColor="#444"
        sectionColor="#666"
        renderOrder={1}
      />

      {effective.postFxEnabled ? (
        <EffectComposer stencilBuffer>
          {[
            effective.bloom ? (
              <Bloom
                key="bloom"
                luminanceThreshold={0.8}
                mipmapBlur
                intensity={0.5}
                radius={0.4}
              />
            ) : null,
            effective.noise ? <Noise key="noise" opacity={0.15} /> : null,
            effective.vignette ? (
              <Vignette key="vignette" eskil={false} offset={0.1} darkness={0.5} />
            ) : null,
          ].filter((node): node is React.ReactElement => node !== null)}
        </EffectComposer>
      ) : null}
    </Canvas>
  )
}
