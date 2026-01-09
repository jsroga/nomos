/* eslint-disable react/no-unknown-property */
'use client'

import React, { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Slider } from '@/components/ui/slider'
import { useInteriorStore, SurfaceType } from '@/domains/interior-designer/store/useInteriorStore'
import { Loader2, Wand2, Layers, Sparkles, Palette, Ruler, Move3d, Trash2, ChevronDown } from 'lucide-react'
import { SidebarSection, SidebarLabel } from '@/components/ui/domain-sidebar'
import { TextureStyle } from '@/domains/interior-designer/ai/TextureService'
import { LocalStorageKeys } from '@/constants/localStorage'
import toast from 'react-hot-toast'
import { cn } from '@/lib/utils'

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

const STYLE_OPTIONS: { value: TextureStyle; label: string; gradient: string }[] = [
    { value: 'painterly', label: 'Painterly', gradient: 'from-violet-500 to-purple-600' },
    { value: 'realistic', label: 'Realistic', gradient: 'from-emerald-500 to-teal-600' },
    { value: 'sketch', label: 'Sketch', gradient: 'from-amber-500 to-orange-600' },
    { value: 'decay', label: 'Decay', gradient: 'from-rose-500 to-red-600' },
    { value: 'metallic', label: 'Metallic', gradient: 'from-slate-400 to-zinc-600' },
    { value: 'organic', label: 'Organic', gradient: 'from-lime-500 to-green-600' },
]



// Slider with label
const LabeledSlider: React.FC<{
    label: string
    value: number
    onChange: (v: number) => void
    min: number
    max: number
    step: number
    unit?: string
    minLabel?: string
    maxLabel?: string
}> = ({ label, value, onChange, min, max, step, unit = '', minLabel, maxLabel }) => (
    <div className="space-y-2">
        <div className="flex justify-between items-center">
            <span className="text-xs font-mono font-medium text-muted-foreground">{label}</span>
            <span className="text-xs font-mono text-primary">
                {value}{unit}
            </span>
        </div>
        <Slider
            value={[value]}
            min={min}
            max={max}
            step={step}
            onValueChange={([v]) => onChange(v)}
            className="cursor-pointer"
        />
        {(minLabel || maxLabel) && (
            <div className="flex justify-between text-[10px] text-muted-foreground/60 font-mono">
                <span>{minLabel}</span>
                <span>{maxLabel}</span>
            </div>
        )}
    </div>
)

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
    const [scale, setScale] = useState(0.5)
    const [showPresets, setShowPresets] = useState(false)

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
        setError(null)
        setPreviewUrl(null)

        try {
            const apiKey = localStorage.getItem(LocalStorageKeys.STABILITY_API_KEY_LEGACY)
            if (!apiKey) {
                toast.error('Please set Stability API Key in Settings')
                setIsGenerating(false)
                return
            }

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
            setPreviewUrl(data.imageUrl)
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

    const surfaceLabel = selectedSurface.type === 'grass' ? 'Land' : selectedSurface.type.charAt(0).toUpperCase() + selectedSurface.type.slice(1)

    return (
        <div className="space-y-4">
            {/* Geometry Section - For Paths/Walls */}
            {(selectedSurface.isPath || selectedSurface.type === 'road') && (

                <SidebarSection
                    title="Geometry"
                    icon={<Ruler size={12} />}
                >

                    <div className="space-y-4">
                        <LabeledSlider
                            label="Width"
                            value={selectedSurface.width ?? 2}
                            onChange={(v) => updateSurface(selectedSurface.id, { width: v })}
                            min={0.5}
                            max={20}
                            step={0.5}
                            unit="m"
                        />

                        {selectedSurface.isVertical ? (
                            <>
                                <LabeledSlider
                                    label="Height"
                                    value={selectedSurface.height ?? 3}
                                    onChange={(v) => updateSurface(selectedSurface.id, { height: v })}
                                    min={0.5}
                                    max={20}
                                    step={0.5}
                                    unit="m"
                                />
                                <LabeledSlider
                                    label="Corner Roundness"
                                    value={selectedSurface.roundness ?? 0.5}
                                    onChange={(v) => updateSurface(selectedSurface.id, { roundness: v })}
                                    min={0}
                                    max={1}
                                    step={0.05}
                                    minLabel="Sharp"
                                    maxLabel="Smooth"
                                />
                                <Button
                                    variant="outline"
                                    size="sm"
                                    className="w-full mt-2 font-mono text-xs"
                                    onClick={() => createFloorFromSurface(selectedSurface.id)}
                                >
                                    <Layers className="w-4 h-4 mr-2" />
                                    Generate Floor
                                </Button>
                            </>
                        ) : (
                            <LabeledSlider
                                label="Roundness"
                                value={selectedSurface.roundness ?? 0.5}
                                onChange={(v) => updateSurface(selectedSurface.id, { roundness: v })}
                                min={0}
                                max={1}
                                step={0.05}
                                minLabel="Straight"
                                maxLabel="Curved"
                            />
                        )}
                    </div>
                </SidebarSection>
            )}

            {/* AI Material Studio */}
            <SidebarSection
                title="AI Material Studio"
                icon={<Palette size={12} />}
                separator
            >

                {/* Style Selector */}
                <div className="flex flex-wrap gap-1.5 mb-4">
                    {STYLE_OPTIONS.map((opt) => (
                        <button
                            key={opt.value}
                            onClick={() => setStyle(opt.value)}
                            className={cn(
                                "flex-1 py-1.5 px-3 rounded text-[10px] font-mono font-medium transition-all duration-200 border",
                                style === opt.value
                                    ? "bg-primary text-primary-foreground border-primary"
                                    : "bg-background text-muted-foreground border-border hover:bg-muted"
                            )}
                        >
                            {opt.label.toUpperCase()}
                        </button>
                    ))}
                </div>

                {/* Prompt Input */}
                <div className="relative mb-3">
                    <Input
                        placeholder={`Describe your ${surfaceLabel.toLowerCase()} material...`}
                        value={prompt}
                        onChange={(e) => setPrompt(e.target.value)}
                        disabled={isGenerating}
                        className="pr-20 font-mono text-xs"
                    />
                    <div className="absolute right-1 top-1/2 -translate-y-1/2 flex gap-1">
                        <Button
                            variant={useMagic ? "default" : "ghost"}
                            size="icon"
                            onClick={() => setUseMagic(!useMagic)}
                            title="Magic Enhance"
                            className={cn(
                                "h-7 w-7 rounded-sm transition-all",
                                useMagic && "text-yellow-400"
                            )}
                        >
                            <Sparkles size={14} className={useMagic ? "fill-yellow-400 text-yellow-400" : "text-muted-foreground"} />
                        </Button>
                        <Button
                            size="icon"
                            onClick={handleGenerate}
                            disabled={isGenerating || !prompt}
                            className="h-7 w-7 rounded-sm"
                        >
                            {isGenerating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Wand2 className="h-4 w-4" />}
                        </Button>
                    </div>
                </div>

                {/* Presets Dropdown */}
                <div className="relative mb-3">
                    <button
                        onClick={() => setShowPresets(!showPresets)}
                        className="w-full flex items-center justify-between text-xs font-mono text-muted-foreground hover:text-foreground py-2 px-3 rounded bg-muted/20 hover:bg-muted/40 transition-all border border-transparent hover:border-border"
                    >
                        <span>Quick presets</span>
                        <ChevronDown size={14} className={cn("transition-transform", showPresets && "rotate-180")} />
                    </button>
                    {showPresets && (
                        <div className="absolute top-full left-0 right-0 mt-1 z-10 p-2 rounded-lg bg-background border border-border shadow-xl animate-in fade-in slide-in-from-top-2 duration-200">
                            <div className="flex flex-wrap gap-1.5">
                                {PROMPT_PRESETS[selectedSurface.type]?.map(p => (
                                    <button
                                        key={p}
                                        onClick={() => {
                                            setPrompt(p)
                                            setShowPresets(false)
                                        }}
                                        className="text-[10px] px-2.5 py-1.5 rounded-full bg-muted hover:bg-primary/20 hover:text-primary transition-all duration-200 font-mono"
                                    >
                                        {p}
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}
                </div>

                {error && (
                    <div className="text-xs text-red-500 bg-red-500/10 border border-red-500/20 p-3 rounded mb-3 font-mono">
                        {error}
                    </div>
                )}
            </SidebarSection>

            {/* Preview */}
            {previewUrl && (
                <SidebarSection
                    title="Generated Preview"
                    icon={<Move3d size={12} />}
                    className="animate-in fade-in zoom-in-95 duration-300"
                    separator
                >
                    <div className="relative aspect-square rounded overflow-hidden border border-border group cursor-pointer bg-muted/20">
                        <img
                            src={previewUrl}
                            alt="Preview"
                            className="w-full h-full object-cover"
                        />
                    </div>
                    <Button
                        onClick={handleApply}
                        className="w-full mt-3 font-mono text-xs"
                    >
                        Apply Material
                    </Button>
                </SidebarSection>
            )}

            {/* Material Properties - When texture is applied */}
            {selectedSurface.texture && !previewUrl && (
                <SidebarSection
                    title="Material Properties"
                    icon={<Layers size={12} />}
                    separator
                >
                    <div className="flex gap-3 mb-4">
                        <div className="w-16 h-16 shrink-0 rounded overflow-hidden border border-border bg-muted/20">
                            <img
                                src={selectedSurface.texture}
                                alt="Current"
                                className="w-full h-full object-cover"
                            />
                        </div>
                        <div className="flex-1 space-y-2">
                            <LabeledSlider
                                label="Scale"
                                value={scale}
                                onChange={(v) => {
                                    setScale(v)
                                    updateSurface(selectedSurface.id, { textureScale: v })
                                }}
                                min={0.1}
                                max={5.0}
                                step={0.1}
                                unit="x"
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3 mb-3">
                        <LabeledSlider
                            label="Roughness"
                            value={selectedSurface.roughness ?? 0.8}
                            onChange={(v) => updateSurface(selectedSurface.id, { roughness: v })}
                            min={0}
                            max={1}
                            step={0.1}
                        />
                        <LabeledSlider
                            label="Metalness"
                            value={selectedSurface.metalness ?? 0}
                            onChange={(v) => updateSurface(selectedSurface.id, { metalness: v })}
                            min={0}
                            max={1}
                            step={0.1}
                        />
                    </div>

                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => updateSurface(selectedSurface.id, { texture: undefined })}
                        className="w-full text-[11px] text-destructive hover:text-destructive hover:bg-destructive/10 border border-transparent hover:border-destructive/20 font-mono"
                    >
                        <Trash2 size={12} className="mr-2" />
                        REMOVE MATERIAL
                    </Button>
                </SidebarSection>
            )}
        </div>
    )
}
