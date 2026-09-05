'use client'

import { useEffect, useState } from 'react'
import { resolveIconModelUrl } from '@/domains/marketing/core/resolve-icon-model-url'
import { MarketingRetryMs } from '@/domains/marketing/constants/viewport-3d'
import { ThreeDIcon } from '@/domains/marketing/ui/ThreeDIcon'
import { useNearViewport } from '@/domains/marketing/ui/three-d-icon/useNearViewport'
import {
  releaseWebGlCanvasSlot,
  tryAcquireWebGlCanvasSlot,
} from '@/domains/marketing/ui/three-d-icon/webgl-canvas-budget'

type ViewportGatedThreeDIconProps = {
  type: string
  posterSrc?: string
  posterAlt?: string
  /** When false, stay on poster (no prefetch/mount). */
  enabled?: boolean
  color?: string
  size?: number
  scale?: number
  offset?: [number, number]
  density?: number
  glowScale?: number
  mouseRotation?: number
  distortion?: number
  speed?: number
  frequency?: number
  contrast?: number
  twist?: number
  metalness?: number
  vignette?: boolean
  className?: string
}

function PosterFallback({
  posterSrc,
  posterAlt,
}: {
  posterSrc?: string
  posterAlt?: string
}) {
  if (posterSrc) {
    return (
      <img
        src={posterSrc}
        alt={posterAlt ?? ''}
        className="absolute inset-0 h-full w-full object-contain opacity-80"
        loading="lazy"
        decoding="async"
      />
    )
  }
  return (
    <div className="absolute inset-0 flex items-center justify-center">
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary/30 border-t-primary" />
    </div>
  )
}

/**
 * Lazy 3D icon: prefetch GLB near viewport, mount WebGL when closer,
 * unmount when far. Honors a small concurrent-canvas budget.
 */
export function ViewportGatedThreeDIcon({
  type,
  posterSrc,
  posterAlt,
  enabled = true,
  className,
  ...iconProps
}: ViewportGatedThreeDIconProps) {
  const { shouldPrefetch, shouldMount, containerRef } = useNearViewport({ enabled })
  const [hasSlot, setHasSlot] = useState(false)
  const modelUrl = resolveIconModelUrl(type)
  const allowPrefetch = enabled && shouldPrefetch
  const allowMount = enabled && shouldMount

  useEffect(() => {
    if (!allowPrefetch) return

    void import('@/domains/marketing/ui/ThreeDIconCanvas')
    void (async () => {
      const mod = await import('@react-three/drei')
      mod.useGLTF.preload(modelUrl)
    })()
  }, [allowPrefetch, modelUrl])

  useEffect(() => {
    if (!allowMount) {
      if (hasSlot) {
        releaseWebGlCanvasSlot()
        setHasSlot(false)
      }
      return
    }

    if (hasSlot) return

    if (tryAcquireWebGlCanvasSlot()) {
      setHasSlot(true)
      return
    }

    const retry = window.setInterval(() => {
      if (tryAcquireWebGlCanvasSlot()) {
        setHasSlot(true)
        window.clearInterval(retry)
      }
    }, MarketingRetryMs.WebGlSlot)

    return () => window.clearInterval(retry)
  }, [allowMount, hasSlot])

  useEffect(() => {
    return () => {
      if (hasSlot) releaseWebGlCanvasSlot()
    }
  }, [hasSlot])

  const showCanvas = allowMount && hasSlot

  return (
    <div ref={containerRef} className={`relative h-full w-full ${className ?? ''}`}>
      {!showCanvas && <PosterFallback posterSrc={posterSrc} posterAlt={posterAlt} />}
      {showCanvas && <ThreeDIcon type={type} {...iconProps} />}
    </div>
  )
}
