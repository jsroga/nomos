/* eslint-disable react/no-unknown-property */
'use client'

import React from 'react'
import { Canvas } from '@react-three/fiber'
import { OrbitControls, Grid, Environment, OrthographicCamera } from '@react-three/drei'
import { EffectComposer, Bloom, Noise, Vignette } from '@react-three/postprocessing'
import { WallManager } from './WallManager'
import { WallTool } from './tools/WallTool'
import { FloorManager } from './FloorManager'
// import { FloorTool } from './tools/FloorTool'
// import { WaterManager } from './WaterManager'
// import { WaterTool } from './tools/WaterTool'
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

export const InteriorCanvas: React.FC = () => {
  return (
    <Canvas shadows className="w-full h-full" gl={{ stencil: true }}>
      <color attach="background" args={['#1e1e1e']} />

      {/* Disco Elysium Style Camera (Adjusted for Isometric) */}
      <OrthographicCamera
        makeDefault
        position={[20, 20, 20]} // True Isometric Angle
        zoom={60}
        near={-100}
        far={300}
        onUpdate={c => c.lookAt(0, 0, 0)}
      />

      <ambientLight intensity={0.4} />
      <directionalLight
        position={[10, 20, 10]}
        intensity={1.2}
        castShadow
        shadow-mapSize={[2048, 2048]}
      />

      {/* Fill light for atmosphere */}
      <pointLight position={[-10, 10, -10]} intensity={0.5} color="#ffffff" />



      <OrbitControls
        makeDefault
        enableRotate={true}
        enableZoom={true}
        minZoom={10}
        maxZoom={100}
      // Lock polar angle for true isometric feel if desired, but freedom is nice too
      // minPolarAngle={Math.PI / 4}
      // maxPolarAngle={Math.PI / 3}
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

      {/* Terrain Tool - operates on surfaces directly, no separate terrain mesh */}
      <TerrainBrushPreview />
      <TerrainTool />

      <Exporter />
      <RetextureExporter />
      <CameraController />
      <KeybindingManager />

      {/* Grid rendered last to appear on top of terrain */}
      <Grid
        infiniteGrid
        cellSize={1}
        sectionSize={5}
        fadeDistance={100}
        cellColor="#444"
        sectionColor="#666"
        renderOrder={1} // Ensure it renders on top
      />

      {/* Post Processing for Disco Elysium Atmosphere */}
      <EffectComposer stencilBuffer>
        <Bloom luminanceThreshold={0.8} mipmapBlur intensity={0.5} radius={0.4} />
        <Noise opacity={0.15} />
        <Vignette eskil={false} offset={0.1} darkness={0.5} />
      </EffectComposer>
    </Canvas>
  )
}
