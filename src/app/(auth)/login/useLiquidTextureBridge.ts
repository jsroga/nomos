'use client'

import { useEffect } from 'react'
import { AUTH_PAGE_ELEMENT_ID } from '@/shared/auth/constants/auth-messages'

export function useLiquidTextureBridge(): void {
  useEffect(() => {
    let rafId: number

    const updateTexture = () => {
      const bgCanvas = document.getElementById(AUTH_PAGE_ELEMENT_ID.TURBULENT_BG_CANVAS)
      const renderer = window.__liquidGLRenderer__

      if (bgCanvas instanceof HTMLCanvasElement && renderer?._uploadTexture) {
        renderer._uploadTexture(bgCanvas)
      }
      rafId = requestAnimationFrame(updateTexture)
    }

    rafId = requestAnimationFrame(updateTexture)

    return () => cancelAnimationFrame(rafId)
  }, [])
}
