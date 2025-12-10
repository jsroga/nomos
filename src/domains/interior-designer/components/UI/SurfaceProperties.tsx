/* eslint-disable react/no-unknown-property */
'use client'

import React, { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Slider } from '@/components/ui/slider'
import { useInteriorStore, SurfaceType } from '@/domains/interior-designer/store/useInteriorStore'
import { Loader2, Wand2, Paintbrush, Box, Layers, Zap, Sparkles } from 'lucide-react'
import { TextureStyle } from '@/domains/interior-designer/ai/TextureService'
import { LocalStorageKeys } from '@/constants/localStorage'
import toast from 'react-hot-toast'

// Simple Label replacement if needed
const Label: React.FC<{ children: React.ReactNode; className?: string }> = ({ children, className }) => (
    <label className={`text-xs font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 mb-1.5 block ${className}`}>
        {children}
    </label>
)

const PROMPT_PRESETS: Record<SurfaceType, string[]> = {
    grass: ['Wild overgrown grass', 'Manicured lawn', 'Dry savannah grass', 'Mossy patch'],
    water: ['Deep blue ocean', 'Murky swamp water', 'Clear pool water', 'Frozen ice'],
    road: ['Cracked asphalt', 'Cobblestone street', 'Dirt path', 'Modern highway'],
    dirt: ['Dry cracked mud', 'Rich dark soil', 'Sandy loam', 'Forest floor'],
    pavement: ['Concrete slabs', 'Brick walkway', 'Hexagon tiles', 'Stone pavers'],
    mars: ['Red dusty soil', 'Martian rocks', 'Alien crater surface', 'Rusty metal ground'],
    sand: ['Golden beach sand', 'White dunes', 'Wet compact sand', 'Desert ripples'],
    rock: ['Grey mountain rock', 'volcanic basalt', 'Smooth river stones', 'Jagged cliff face']
}

export const SurfaceProperties: React.FC = () => {
    const selectedId = useInteriorStore(state => state.selectedId)
    const surfaces = useInteriorStore(state => state.surfaces)
    const updateSurface = useInteriorStore(state => state.updateSurface)
    const createFloorFromSurface = useInteriorStore(state => state.createFloorFromSurface)

    const selectedSurface = surfaces.find(s => s.id === selectedId)

    const [prompt, setPrompt] = useState('')
    const [style, setStyle] = useState<TextureStyle>('painterly')
    const [useMagic, setUseMagic] = useState(true)
    const [isGenerating, setIsGenerating] = useState(false)
    const [previewUrl, setPreviewUrl] = useState<string | null>(null)
    const [error, setError] = useState<string | null>(null)

    // Local state for sliders to avoid spamming store updates
    const [scale, setScale] = useState(0.5)

    useEffect(() => {
        if (selectedSurface) {
            setPrompt(selectedSurface.type)
            setPreviewUrl(null)
            setError(null)
            setStyle('painterly')
            setScale(selectedSurface.textureScale || 0.5)
        }
    }, [selectedSurface?.id])

    if (!selectedSurface) return null

    const handleGenerate = async () => {
        if (!prompt) return

        setIsGenerating(true)
        setError(null) // Clear previous errors
        setPreviewUrl(null) // Clear previous preview

        try {
            // Get API Key from localStorage (temporary solution)
            const apiKey = localStorage.getItem(LocalStorageKeys.STABILITY_API_KEY_LEGACY)
            if (!apiKey) {
                toast.error('Please set Stability API Key in Settings')
                setIsGenerating(false) // Ensure loading state is reset
                return
            }

            // Smart Dimensions (IQ 200)
            // If it's a linear feature (Road/Path), generation should be wide/panoramic to capture the flow.
            // Stability SDXL supports 1536x640 (~2.4:1)
            let width = 1024
            let height = 1024

            if (selectedSurface && (selectedSurface.isPath || selectedSurface.type === 'road')) {
                width = 1536
                height = 640
            }

            const res = await fetch('/api/interior-designer/texture', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    prompt,
                    apiKey,
                    style,
                    useSemanticSearch: useMagic,
                    width,
                    height
                })
            })

            if (!res.ok) {
                const err = await res.json()
                throw new Error(err.error || 'Generation failed')
            }

            const data = await res.json()
            setPreviewUrl(data.imageUrl) // Use setPreviewUrl instead of setGeneratedTexture
        } catch (e: any) {
            setError(e.message)
        } finally {
            setIsGenerating(false)
        }
    }

    const handleApply = () => {
        if (previewUrl && selectedSurface) {
            updateSurface(selectedSurface.id, { texture: previewUrl })
            setPreviewUrl(null)
        }
    }

    return (
        <div className="space-y-6 p-1">
            {/* Header */}
            <div className="flex items-center justify-between border-b pb-2">
                <span className="text-xs font-semibold uppercase text-muted-foreground tracking-wider">{selectedSurface.type === 'grass' ? 'Land' : selectedSurface.type} Surface</span>
                <div className="flex gap-1">
                    <div className="w-2 h-2 rounded-full bg-primary/50" />
                </div>
            </div>

            {/* Geometry / Dimensions Section - Always Visible for Paths/Walls */}
            {(selectedSurface.isPath || selectedSurface.type === 'road') && (
                <div className="space-y-4 py-4 border-b">
                    <span className="text-xs font-semibold uppercase text-muted-foreground tracking-wider block mb-3">Geometry</span>

                    {/* Width Control */}
                    <div className="space-y-1">
                        <Label>Width</Label>
                        <Slider
                            value={[selectedSurface.width ?? 2]}
                            min={0.5}
                            max={20}
                            step={0.5}
                            onValueChange={(vals) => updateSurface(selectedSurface.id, { width: vals[0] })}
                        />
                        <div className="flex justify-between text-[10px] text-muted-foreground">
                            <span>{selectedSurface.width ?? 2}m</span>
                        </div>
                    </div>

                    {/* Roundness - For Roads (Non-Vertical) */}
                    {!selectedSurface.isVertical && (
                        <div className="space-y-1">
                            <Label>Roundness</Label>
                            <Slider
                                value={[selectedSurface.roundness ?? 0.5]}
                                min={0}
                                max={1}
                                step={0.05}
                                onValueChange={(vals) => updateSurface(selectedSurface.id, { roundness: vals[0] })}
                            />
                            <div className="flex justify-between text-[10px] text-muted-foreground">
                                <span>Straight</span>
                                <span>Curved</span>
                            </div>
                        </div>
                    )}

                    {/* Vertical / Wall Controls */}
                    {selectedSurface.isVertical && (
                        <div className="space-y-4 border-l-2 pl-3 ml-1 border-primary/20">
                            <div className="space-y-1">
                                <Label>Wall Height</Label>
                                <Slider
                                    value={[selectedSurface.height ?? 3]}
                                    min={0.5}
                                    max={20}
                                    step={0.5}
                                    onValueChange={(vals) => updateSurface(selectedSurface.id, { height: vals[0] })}
                                />
                                <div className="flex justify-between text-[10px] text-muted-foreground">
                                    <span>{selectedSurface.height ?? 3}m</span>
                                </div>
                            </div>

                            <div className="space-y-1">
                                <Label>Corner Roundness</Label>
                                <Slider
                                    value={[selectedSurface.roundness ?? 0.5]}
                                    min={0}
                                    max={1}
                                    step={0.05}
                                    onValueChange={(vals) => updateSurface(selectedSurface.id, { roundness: vals[0] })}
                                />
                                <div className="flex justify-between text-[10px] text-muted-foreground">
                                    <span>Sharp</span>
                                    <span>Round</span>
                                </div>
                            </div>

                            <Button
                                variant="secondary"
                                size="sm"
                                className="w-full text-xs mt-2"
                                onClick={() => createFloorFromSurface(selectedSurface.id)}
                            >
                                <Layers className="w-3 h-3 mr-2" />
                                Generate Floor
                            </Button>
                        </div>
                    )}
                </div>
            )}

            {/* AI Generator Section */}
            <div className="space-y-3">
                <div className="flex items-center justify-between">
                    <Label className="text-primary">AI Material Studio</Label>
                    <div className="flex bg-muted rounded-md p-0.5">
                        {['painterly', 'realistic', 'sketch', 'decay'].map((s) => (
                            <button
                                key={s}
                                onClick={() => setStyle(s as TextureStyle)}
                                className={`px-2 py-0.5 text-[10px] rounded-sm transition-all ${style === s ? 'bg-background shadow text-foreground' : 'text-muted-foreground hover:text-foreground'}`}
                                title={s}
                            >
                                {s.slice(0, 1).toUpperCase() + s.slice(1)}
                            </button>
                        ))}
                    </div>
                </div>

                <div className="flex gap-2">
                    <Input
                        placeholder={`Describe ${selectedSurface.type}...`}
                        value={prompt}
                        onChange={(e) => setPrompt(e.target.value)}
                        disabled={isGenerating}
                        className="h-8 text-xs font-medium"
                    />
                    <Button
                        variant={useMagic ? "default" : "outline"}
                        size="icon"
                        onClick={() => setUseMagic(!useMagic)}
                        title="Magic Enhance (AI Rewrite)"
                        className="h-8 w-8 shrink-0"
                    >
                        <Sparkles size={14} className={useMagic ? "text-yellow-300" : "text-muted-foreground"} />
                    </Button>
                    <Button
                        size="sm"
                        onClick={handleGenerate}
                        disabled={isGenerating || !prompt}
                        className="h-8 w-8 p-0 shrink-0"
                    >
                        {isGenerating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Wand2 className="h-4 w-4" />}
                    </Button>
                </div>

                {/* Quick Chips */}
                <div className="flex flex-wrap gap-1.5">
                    {PROMPT_PRESETS[selectedSurface.type]?.map(p => (
                        <button
                            key={p}
                            onClick={() => setPrompt(p)}
                            className="bg-muted hover:bg-muted/80 text-[10px] px-2 py-1 rounded-full text-muted-foreground border border-transparent hover:border-primary/20 transition-colors"
                        >
                            {p}
                        </button>
                    ))}
                </div>

                {error && <p className="text-xs text-destructive bg-destructive/10 p-2 rounded">{error}</p>}
            </div>

            {/* Preview Area */}
            {previewUrl && (
                <div className="space-y-2 animate-in fade-in zoom-in-95 bg-muted/30 p-2 rounded border border-primary/20">
                    <Label>Generated Material</Label>
                    <div className="relative aspect-square rounded-md overflow-hidden border shadow-inner group">
                        <img src={previewUrl} alt="Preview" className="w-full h-full object-cover transition-transform group-hover:scale-110 duration-700" />
                        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors" />
                    </div>
                    <Button onClick={handleApply} size="sm" className="w-full">
                        Apply to Surface
                    </Button>
                </div>
            )}

            {/* Material Properties */}
            {selectedSurface.texture && !previewUrl && (
                <div className="space-y-4 pt-2 border-t">
                    <div className="flex gap-3">
                        <div className="w-16 h-16 shrink-0 relative rounded-md overflow-hidden border">
                            <img src={selectedSurface.texture} alt="Current" className="w-full h-full object-cover" />
                        </div>
                        <div className="flex-1 space-y-1">
                            <Label>Scale</Label>
                            <Slider
                                value={[scale]}
                                min={0.1}
                                max={5.0}
                                step={0.1}
                                onValueChange={(vals) => {
                                    setScale(vals[0])
                                    updateSurface(selectedSurface.id, { textureScale: vals[0] })
                                }}
                            />
                            <div className="flex justify-between text-[10px] text-muted-foreground">
                                <span>Detail</span>
                                <span>{scale}x</span>
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1">
                            <Label>Roughness</Label>
                            <Slider
                                value={[selectedSurface.roughness ?? 0.8]}
                                min={0}
                                max={1}
                                step={0.1}
                                onValueChange={(vals) => updateSurface(selectedSurface.id, { roughness: vals[0] })}
                            />
                        </div>
                        <div className="space-y-1">
                            <Label>Metalness</Label>
                            <Slider
                                value={[selectedSurface.metalness ?? 0]}
                                min={0}
                                max={1}
                                step={0.1}
                                onValueChange={(vals) => updateSurface(selectedSurface.id, { metalness: vals[0] })}
                            />
                        </div>
                    </div>

                    <Button variant="ghost" size="sm" onClick={() => updateSurface(selectedSurface.id, { texture: undefined })} className="w-full h-6 text-[10px] text-destructive hover:text-destructive hover:bg-destructive/10">
                        Remove Material
                    </Button>
                </div >
            )}
        </div >
    )
}
