'use client'

import { useState, useEffect } from 'react'
import LoginButton from '@/components/auth/LoginButton'
import { Box, Map, BookOpen, Home } from 'lucide-react'
import { Liquid } from '@/domains/marketing/components/Liquid'
import { TurbulentBackground } from '@/domains/marketing/components/TurbulentBackground'

export default function LoginPage() {
  const [bgElement, setBgElement] = useState<HTMLDivElement | null>(null)

  // Live Texture Bridge: continuously update liquidGL texture from the background canvas
  useEffect(() => {
    let rafId: number

    const updateTexture = () => {
      const bgCanvas = document.getElementById('turbulent-bg-canvas') as HTMLCanvasElement
      const renderer = (window as any).__liquidGLRenderer__

      if (bgCanvas && renderer && renderer._uploadTexture) {
        renderer._uploadTexture(bgCanvas)
      }
      rafId = requestAnimationFrame(updateTexture)
    }

    // Start loop
    rafId = requestAnimationFrame(updateTexture)

    return () => cancelAnimationFrame(rafId)
  }, [])

  return (
    <TurbulentBackground onRef={setBgElement}>
      <div className="flex min-h-screen w-full items-center justify-center p-4 relative z-10">
        <div className="w-full max-w-md space-y-8 animate-in fade-in zoom-in duration-500">
          <div className="flex flex-col items-center space-y-2 text-center">
            <img src="/logo.png" alt="KUR" className="h-32 w-auto drop-shadow-lg mb-4" />
            <p className="text-white/70 text-lg">Create infinite worlds and 3D assets with AI</p>
          </div>

          {/* Liquid Container Wrapper */}
          <Liquid
            snapshot={bgElement}
            speed={1.0}
            refraction={0.04}
            bevelDepth={0.3}
            bevelWidth={0.02}
            specular={true}
            frost={0.1}
            intensity={1.5}
          >
            <div className="p-8 h-full flex flex-col justify-center">
              <div className="space-y-6">
                <div className="grid grid-cols-2 gap-4 text-sm text-white/70">
                  <div className="flex flex-col items-center gap-2 p-3 bg-white/5 rounded-lg border border-white/10 hover:border-primary/30 transition-colors">
                    <Map className="text-primary w-6 h-6" />
                    <span className="font-medium">World Gen</span>
                  </div>
                  <div className="flex flex-col items-center gap-2 p-3 bg-white/5 rounded-lg border border-white/10 hover:border-primary/30 transition-colors">
                    <Box className="text-primary w-6 h-6" />
                    <span className="font-medium">3D Export</span>
                  </div>
                  <div className="flex flex-col items-center gap-2 p-3 bg-white/5 rounded-lg border border-white/10 hover:border-primary/30 transition-colors">
                    <BookOpen className="text-primary w-6 h-6" />
                    <span className="font-medium">Storyteller</span>
                  </div>
                  <div className="flex flex-col items-center gap-2 p-3 bg-white/5 rounded-lg border border-white/10 hover:border-primary/30 transition-colors">
                    <Home className="text-primary w-6 h-6" />
                    <span className="font-medium">Interior</span>
                  </div>
                </div>

                <div className="space-y-4">
                  <LoginButton />
                  <p className="text-xs text-center text-white/50">
                    Continue to access your infinite canvas
                  </p>
                </div>
              </div>
            </div>
          </Liquid>
        </div>
      </div>
    </TurbulentBackground>
  )
}
