'use client'

import { useState, useEffect } from 'react'
import LoginButton from '@/components/auth/LoginButton'
import { BleedingText } from '@/components/ui/BleedingText'
import { Liquid } from '@/domains/marketing/components/Liquid'
import { TurbulentBackground } from '@/domains/marketing/components/TurbulentBackground'
import { TURBULENT_BG_PROPS, LIQUID_PROPS } from '@/lib/constants/visuals'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'

export default function LoginPage() {
  const [bgElement, setBgElement] = useState<HTMLDivElement | null>(null)

  // Design-only state for email/password inputs
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')

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
    <TurbulentBackground onRef={setBgElement} {...TURBULENT_BG_PROPS}>
      <div className="flex min-h-screen w-full items-center justify-center p-4 relative z-10">
        <div className="w-full max-w-md animate-in fade-in zoom-in duration-500">
          {/* Liquid Container Wrapper */}
          <Liquid snapshot={bgElement} {...LIQUID_PROPS}>
            <div className="p-8 h-full flex flex-col justify-center bg-black/40 backdrop-blur-md rounded-2xl border border-white/10 shadow-2xl">
              <div className="flex flex-col items-center space-y-2 text-center mb-8">
                <img src="/logo.svg" alt="KUR" className="w-32 h-auto drop-shadow-lg mb-2" />
                <h1 className="text-sm font-bold tracking-tight">
                  <BleedingText
                    text="Build worlds that bleed"
                    className="uppercase font-syne"
                    textColor="text-red-500"
                    particleColor="text-red-600"
                  />
                </h1>
              </div>

              <div className="space-y-6">
                <Tabs defaultValue="signin" className="w-full">
                  <TabsList className="grid w-full grid-cols-2 bg-white/5 border border-white/10 mb-6">
                    <TabsTrigger
                      value="signin"
                      className="data-[state=active]:bg-white/10 data-[state=active]:text-white text-white/60"
                    >
                      Sign In
                    </TabsTrigger>
                    <TabsTrigger
                      value="signup"
                      className="data-[state=active]:bg-white/10 data-[state=active]:text-white text-white/60"
                    >
                      Sign Up
                    </TabsTrigger>
                  </TabsList>

                  <TabsContent value="signin" className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="email" className="text-white/80">
                        Email
                      </Label>
                      <Input
                        id="email"
                        type="email"
                        placeholder="m@example.com"
                        className="bg-black/30 border-white/10 text-white placeholder:text-white/30 focus:border-white/30"
                        value={email}
                        onChange={e => setEmail(e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <Label htmlFor="password" className="text-white/80">
                          Password
                        </Label>
                        <a
                          href="#"
                          className="text-xs text-white/50 hover:text-white transition-colors"
                        >
                          Forgot password?
                        </a>
                      </div>
                      <Input
                        id="password"
                        type="password"
                        className="bg-black/30 border-white/10 text-white placeholder:text-white/30 focus:border-white/30"
                        value={password}
                        onChange={e => setPassword(e.target.value)}
                      />
                    </div>
                    <Button className="w-full bg-primary hover:bg-primary/90 text-white" size="lg">
                      Sign In
                    </Button>
                  </TabsContent>

                  <TabsContent value="signup" className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="signup-email" className="text-white/80">
                        Email
                      </Label>
                      <Input
                        id="signup-email"
                        type="email"
                        placeholder="m@example.com"
                        className="bg-black/30 border-white/10 text-white placeholder:text-white/30 focus:border-white/30"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="signup-password" className="text-white/80">
                        Password
                      </Label>
                      <Input
                        id="signup-password"
                        type="password"
                        className="bg-black/30 border-white/10 text-white placeholder:text-white/30 focus:border-white/30"
                      />
                    </div>
                    <Button className="w-full bg-primary hover:bg-primary/90 text-white" size="lg">
                      Create Account
                    </Button>
                  </TabsContent>
                </Tabs>

                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <span className="w-full border-t border-white/10" />
                  </div>
                  <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-transparent px-2 text-white/40">Or continue with</span>
                  </div>
                </div>

                <LoginButton />

                <p className="text-[10px] text-center text-white/30 leading-tight px-4 pt-2">
                  By signing up, you agree to our{' '}
                  <a
                    href="/terms"
                    className="hover:text-white underline decoration-white/30 underline-offset-2"
                  >
                    Terms of Service
                  </a>{' '}
                  and{' '}
                  <a
                    href="/privacy"
                    className="hover:text-white underline decoration-white/30 underline-offset-2"
                  >
                    Privacy Policy
                  </a>
                  .
                </p>
              </div>
            </div>
          </Liquid>
        </div>
      </div>
    </TurbulentBackground>
  )
}
