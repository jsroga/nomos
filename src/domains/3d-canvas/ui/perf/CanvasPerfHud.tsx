/* eslint-disable react/no-unknown-property */
'use client'

import React, { useEffect, useRef, useState } from 'react'
import { useThree, useFrame } from '@react-three/fiber'
import { Html } from '@react-three/drei'
import { isPerfDebugEnabled } from '@/shared/debug'
import { useInteriorStore } from '@/domains/3d-canvas'
import { getTextureCacheSize } from '@/domains/3d-canvas/core/textureCache'
import {
  CanvasPerfHudCopy,
  CanvasPerfHudSampleMs,
} from '@/domains/3d-canvas/constants/render-quality'

interface PerfSample {
  fps: number
  frameMs: number
  geometries: number
  textures: number
  programs: number
  drawCalls: number
  triangles: number
  objects: number
  textureCache: number
  heightmapVersion: number
  heightmapBumpsPerSec: number
}

const EMPTY_SAMPLE: PerfSample = {
  fps: 0,
  frameMs: 0,
  geometries: 0,
  textures: 0,
  programs: 0,
  drawCalls: 0,
  triangles: 0,
  objects: 0,
  textureCache: 0,
  heightmapVersion: 0,
  heightmapBumpsPerSec: 0,
}

/**
 * Opt-in overlay: enable with NEXT_PUBLIC_FF_PERF_DEBUG=true.
 * Samples renderer.info + store signals once per second.
 */
export function CanvasPerfHud(): null | React.ReactElement {
  if (!isPerfDebugEnabled()) return null
  return <CanvasPerfHudInner />
}

function CanvasPerfHudInner(): React.ReactElement {
  const { gl } = useThree()
  const [sample, setSample] = useState<PerfSample>(EMPTY_SAMPLE)
  const framesRef = useRef(0)
  const lastSampleAtRef = useRef(performance.now())
  const lastVersionRef = useRef(useInteriorStore.getState().terrainSettings.heightmapVersion)
  const bumpsRef = useRef(0)

  useEffect(() => {
    return useInteriorStore.subscribe(state => {
      const version = state.terrainSettings.heightmapVersion
      if (version !== lastVersionRef.current) {
        lastVersionRef.current = version
        bumpsRef.current += 1
      }
    })
  }, [])

  useFrame(() => {
    framesRef.current += 1
    const now = performance.now()
    const elapsed = now - lastSampleAtRef.current
    if (elapsed < CanvasPerfHudSampleMs.Interval) return

    const fps = (framesRef.current * 1000) / elapsed
    const info = gl.info
    setSample({
      fps: Math.round(fps),
      frameMs: Math.round((1000 / Math.max(fps, 1)) * 10) / 10,
      geometries: info.memory.geometries,
      textures: info.memory.textures,
      programs: info.programs?.length ?? 0,
      drawCalls: info.render.calls,
      triangles: info.render.triangles,
      objects: useInteriorStore.getState().objects.length,
      textureCache: getTextureCacheSize(),
      heightmapVersion: lastVersionRef.current,
      heightmapBumpsPerSec: bumpsRef.current,
    })

    framesRef.current = 0
    bumpsRef.current = 0
    lastSampleAtRef.current = now
  })

  return (
    <Html fullscreen style={{ pointerEvents: 'none' }}>
      <div className="absolute bottom-3 left-3 z-50 rounded-md border border-white/20 bg-black/80 px-3 py-2 font-mono text-[10px] leading-relaxed text-zinc-200 shadow-lg">
        <div className="mb-1 font-bold uppercase tracking-wider text-zinc-400">
          {CanvasPerfHudCopy.Title}
        </div>
        <div>
          {sample.fps} fps · {sample.frameMs} ms
        </div>
        <div>
          draw {sample.drawCalls} · tri {sample.triangles}
        </div>
        <div>
          geo {sample.geometries} · tex {sample.textures} · prog {sample.programs}
        </div>
        <div>
          objects {sample.objects} · cache {sample.textureCache}
        </div>
        <div>
          hm v{sample.heightmapVersion} · bumps/s {sample.heightmapBumpsPerSec}
        </div>
        <div className="mt-1 text-zinc-500">{CanvasPerfHudCopy.Hint}</div>
      </div>
    </Html>
  )
}
