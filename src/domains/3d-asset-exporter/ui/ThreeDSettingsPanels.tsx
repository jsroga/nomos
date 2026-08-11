'use client'

import { Layers } from 'lucide-react'
import { Button } from '@/components/Button'
import { AIProvider } from '@/shared/types/enums'
import { MeshyTopology } from '../core/types/three-d-generation'

export function ThreeDGenerationSettings(props: {
  showSettings: boolean
  modelUrl: string | undefined
  isGenerating: boolean
  provider: AIProvider
  topology: MeshyTopology
  setTopology: (t: MeshyTopology) => void
  targetPolycount: number
  setTargetPolycount: (n: number) => void
}) {
  const {
    showSettings,
    modelUrl,
    isGenerating,
    provider,
    topology,
    setTopology,
    targetPolycount,
    setTargetPolycount,
  } = props

  if (!(showSettings && !modelUrl && !isGenerating && provider === AIProvider.Meshy)) {
    return null
  }

  return (
    <div className="px-3 py-2 border-b border-border bg-muted/10 space-y-2">
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <label className="text-xs text-muted-foreground whitespace-nowrap">Topology:</label>
          <select
            className="h-7 text-xs bg-background border border-input rounded px-2 outline-none focus:ring-1 focus:ring-primary"
            value={topology}
            onChange={e => {
              const next = e.target.value
              if (next === MeshyTopology.Quad || next === MeshyTopology.Triangle) setTopology(next)
            }}
          >
            <option value={MeshyTopology.Triangle}>Triangle</option>
            <option value={MeshyTopology.Quad}>Quad</option>
          </select>
        </div>

        <div className="flex items-center gap-2 flex-1">
          <label className="text-xs text-muted-foreground whitespace-nowrap">Polycount:</label>
          <input
            type="range"
            min="100"
            max="300000"
            step="1000"
            value={targetPolycount}
            onChange={e => setTargetPolycount(Number(e.target.value))}
            className="flex-1 h-1.5 bg-muted rounded-full appearance-none cursor-pointer accent-primary"
          />
          <span className="text-xs text-muted-foreground w-16 text-right">
            {targetPolycount >= 1000
              ? `${(targetPolycount / 1000).toFixed(0)}k`
              : targetPolycount}
          </span>
        </div>
      </div>
      <p className="text-[10px] text-muted-foreground">
        Default: 30k polys, triangle mesh. Higher polycount = more detail but larger file.
      </p>
    </div>
  )
}

export function ThreeDRemeshSettings(props: {
  showRemeshSettings: boolean
  modelUrl: string | undefined
  isRemeshing: boolean
  remeshTopology: MeshyTopology
  setRemeshTopology: (t: MeshyTopology) => void
  remeshPolycount: number
  setRemeshPolycount: (n: number) => void
  remeshHeight: string
  setRemeshHeight: (v: string) => void
  handleRemesh: () => void
}) {
  const {
    showRemeshSettings,
    modelUrl,
    isRemeshing,
    remeshTopology,
    setRemeshTopology,
    remeshPolycount,
    setRemeshPolycount,
    remeshHeight,
    setRemeshHeight,
    handleRemesh,
  } = props

  if (!(showRemeshSettings && modelUrl && !isRemeshing)) {
    return null
  }

  return (
    <div className="px-3 py-2 border-b border-border bg-blue-500/5 space-y-2">
      <div className="flex items-center gap-2 text-xs font-medium text-blue-400 mb-2">
        <Layers size={12} />
        Remesh Settings
      </div>
      <div className="flex items-center gap-4 flex-wrap">
        <div className="flex items-center gap-2">
          <label className="text-xs text-muted-foreground whitespace-nowrap">Topology:</label>
          <select
            className="h-7 text-xs bg-background border border-input rounded px-2 outline-none focus:ring-1 focus:ring-primary"
            value={remeshTopology}
            onChange={e => {
              const next = e.target.value
              if (next === MeshyTopology.Quad || next === MeshyTopology.Triangle) {
                setRemeshTopology(next)
              }
            }}
          >
            <option value={MeshyTopology.Triangle}>Triangle</option>
            <option value={MeshyTopology.Quad}>Quad</option>
          </select>
        </div>
        <div className="flex items-center gap-2 flex-1 min-w-[180px]">
          <label className="text-xs text-muted-foreground whitespace-nowrap">Polycount:</label>
          <input
            type="range"
            min="100"
            max="300000"
            step="1000"
            value={remeshPolycount}
            onChange={e => setRemeshPolycount(Number(e.target.value))}
            className="flex-1 h-1.5 bg-muted rounded-full appearance-none cursor-pointer accent-primary"
          />
          <span className="text-xs text-muted-foreground w-16 text-right">
            {remeshPolycount >= 1000 ? `${(remeshPolycount / 1000).toFixed(0)}k` : remeshPolycount}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <label className="text-xs text-muted-foreground whitespace-nowrap">Height (m):</label>
          <input
            type="number"
            step="0.1"
            placeholder="auto"
            value={remeshHeight}
            onChange={e => setRemeshHeight(e.target.value)}
            className="h-7 w-20 text-xs bg-background border border-input rounded px-2 outline-none focus:ring-1 focus:ring-primary"
          />
        </div>
        <Button size="sm" onClick={handleRemesh} className="gap-1">
          <Layers size={14} />
          Start Remesh
        </Button>
      </div>
    </div>
  )
}
