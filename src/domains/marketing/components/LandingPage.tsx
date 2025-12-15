'use client'

import { useState, useEffect } from 'react'

import { FluidHeadline } from './FluidHeadline'
import { FluidControls } from './FluidControls'
import { WaitlistForm } from './WaitlistForm'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Map, Boxes, Key, Sparkles, Layers, Wand2 } from 'lucide-react'

import { TurbulentBackground } from './TurbulentBackground'

import { Liquid } from './Liquid'

export function LandingPage() {
    const [zoom, setZoom] = useState(0.1)
    const [rotation, setRotation] = useState(3.33) // 191 degrees
    const [speed, setSpeed] = useState(1.0) // Flow Speed
    const [morphSpeed, setMorphSpeed] = useState(0.5) // Morph Speed
    const [colorShift, setColorShift] = useState(0)
    const [saturation, setSaturation] = useState(0.65)
    const [brightness, setBrightness] = useState(2.39)
    const [contrast, setContrast] = useState(1.32)
    const [hue, setHue] = useState(0)

    const [refraction, setRefraction] = useState(0.2)
    const [bevelWidth, setBevelWidth] = useState(0.1)
    const [bevelDepth, setBevelDepth] = useState(0.0) // Flat
    const [intensity, setIntensity] = useState(5.0) // Strong interaction
    const [frost, setFrost] = useState(1.0) // Strong blur

    // State for the background element ref (for liquid snapshot)
    const [bgElement, setBgElement] = useState<HTMLDivElement | null>(null)

    // Live Texture Bridge: continuously update liquidGL texture from the background canvas
    useEffect(() => {
        let rafId: number

        const updateTexture = () => {
            const bgCanvas = document.getElementById('turbulent-bg-canvas') as HTMLCanvasElement
            // @ts-ignore
            const renderer = window.__liquidGLRenderer__

            if (bgCanvas && renderer && renderer._uploadTexture) {
                // Determine if we need to update (performance throttle?)
                // For now, sync every frame for smoothness
                renderer._uploadTexture(bgCanvas)
            }
            rafId = requestAnimationFrame(updateTexture)
        }

        // Start loop
        rafId = requestAnimationFrame(updateTexture)

        return () => cancelAnimationFrame(rafId)
    }, [])

    // LiquidGL style settings derived from state
    const liquidOptions = {
        snapshot: bgElement, // Use the actual background element for correct UV mapping
        refraction,
        bevelWidth,
        bevelDepth,
        specular: true,
        intensity,
        frost
    }

    const handleReset = () => {
        setZoom(0.1)
        setRotation(3.33)
        setSpeed(1.0)
        setMorphSpeed(0.5)
        setColorShift(0)
        setSaturation(0.65)
        setBrightness(2.39)
        setContrast(1.32)
        setHue(0)
        // Reset Liquid Options to User Defaults
        setRefraction(0.2)
        setBevelWidth(0.1)
        setBevelDepth(0.0)
        setIntensity(5.0)
        setFrost(1.0)
    }

    return (
        <TurbulentBackground
            zoom={zoom}
            rotation={rotation}
            speed={speed}
            morphSpeed={morphSpeed}
            colorShift={colorShift}
            saturation={saturation}
            brightness={brightness}
            contrast={contrast}
            hue={hue}
            onRef={setBgElement}
        >
            {/* Script Loader moved to layout */}

            <FluidControls
                zoom={zoom}
                rotation={rotation}
                colorShift={colorShift}
                saturation={saturation}
                brightness={brightness}
                contrast={contrast}
                hue={hue}
                onZoomChange={setZoom}
                onRotationChange={setRotation}
                speed={speed}
                onSpeedChange={setSpeed}
                morphSpeed={morphSpeed}
                onMorphSpeedChange={setMorphSpeed}
                onColorShiftChange={setColorShift}
                onSaturationChange={setSaturation}
                onBrightnessChange={setBrightness}
                onContrastChange={setContrast}
                onHueChange={setHue}
                // Liquid Controls
                refraction={refraction}
                onRefractionChange={setRefraction}
                bevelWidth={bevelWidth}
                onBevelWidthChange={setBevelWidth}
                bevelDepth={bevelDepth}
                onBevelDepthChange={setBevelDepth}
                intensity={intensity}
                onIntensityChange={setIntensity}
                frost={frost}
                onFrostChange={setFrost}
                onReset={handleReset}
            />

            <div className="relative z-10 w-full min-h-screen text-white overflow-y-auto">
                {/* Navigation */}
                <nav className="fixed top-0 left-0 right-0 z-50 p-6 flex justify-between items-center max-w-7xl mx-auto w-full mix-blend-difference">
                    <div className="text-2xl font-black tracking-tighter font-syne">C.</div>
                    <div className="flex gap-4">
                        <Link href="/login">
                            <Button variant="ghost" className="text-white hover:text-white/80">Sign In</Button>
                        </Link>
                    </div>
                </nav>

                {/* Hero Section */}
                <section className="min-h-screen flex flex-col justify-center items-start text-left px-6 md:px-12 pt-20 pb-32 max-w-7xl mx-auto w-full">
                    <div className="space-y-8 max-w-4xl animate-in fade-in zoom-in duration-1000 slide-in-from-bottom-8">
                        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/10 text-sm font-medium text-white/80 backdrop-blur-md">
                            <Sparkles className="w-3 h-3 text-yellow-400" />
                            <span>Closed Beta Access</span>
                        </div>

                        <FluidHeadline>
                            Cutafonina
                        </FluidHeadline>

                        <p className="text-xl md:text-2xl text-white/60 max-w-2xl leading-relaxed">
                            Procedural generation at the speed of thought. Create infinite tiled worlds, export 3D assets, and simulate history with AI.
                        </p>

                        <div className="pt-4 w-full max-w-md">
                            <WaitlistForm />
                        </div>
                    </div>

                    {/* Floaties */}
                    <div className="absolute top-1/3 left-10 hidden lg:block animate-pulse duration-[4000ms]">
                        <Map className="w-24 h-24 text-white/5 rotate-12" />
                    </div>
                    <div className="absolute bottom-1/4 right-10 hidden lg:block animate-pulse duration-[5000ms] delay-1000">
                        <Boxes className="w-32 h-32 text-white/5 -rotate-12" />
                    </div>
                </section>

                {/* Features Grid */}
                <section className="px-4 pb-32 max-w-7xl mx-auto">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <Liquid
                            speed={speed}
                            {...liquidOptions}
                        >
                            <FeatureCard
                                icon={<Layers className="w-8 h-8 text-white" />}
                                title="Infinite Canvas"
                                description="Seamlessly tile-able generation using diffusion models. Expand your world in any direction."
                                theme="blue"
                            />
                        </Liquid>
                        <Liquid speed={speed} {...liquidOptions}>
                            <FeatureCard
                                icon={<Wand2 className="w-8 h-8 text-white" />}
                                title="AI Dungeon Master"
                                description="Storyteller engine that simulates factions, history, and events on your map."
                                theme="purple"
                            />
                        </Liquid>
                        <Liquid speed={speed} {...liquidOptions}>
                            <FeatureCard
                                icon={<Boxes className="w-8 h-8 text-white" />}
                                title="Asset Export"
                                description="Convert 2D tiles into production-ready 3D meshes and textures instantly."
                                theme="emerald"
                            />
                        </Liquid>
                    </div>
                </section>

                {/* Footer */}
                <footer className="border-t border-white/10 py-12 text-center text-white/30 text-sm">
                    <p>&copy; {(new Date()).getFullYear()} Tilemap Builder. All rights reserved.</p>
                </footer>
            </div>
        </TurbulentBackground>
    )
}

function FeatureCard({ icon, title, description, theme = 'blue' }: { icon: React.ReactNode, title: string, description: string, theme?: 'blue' | 'purple' | 'emerald' }) {
    const themeStyles = {
        blue: "shadow-blue-500/40 border-blue-500/20",
        purple: "shadow-purple-500/40 border-purple-500/20",
        emerald: "shadow-emerald-500/40 border-emerald-500/20"
    }

    return (
        <div className="p-8 h-full flex flex-col justify-center group relative overflow-hidden transition-all hover:scale-[1.02] bg-[#000000a6] rounded-2xl">
            <div className="relative z-10">
                <div className={`mb-6 w-16 h-16 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform duration-500 bg-white/5 border ${themeStyles[theme]} shadow-lg backdrop-blur-sm`}>
                    {icon}
                </div>
                <h3 className="text-xl font-bold mb-2 text-white">{title}</h3>
                <p className="text-white/60 leading-relaxed">{description}</p>
            </div>
        </div>
    )
}
