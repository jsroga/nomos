'use client'

import React from 'react'
import { Button } from '@/components/Button'
import { Input } from '@/components/Input'
import { SidebarSection } from '@/components/DomainSidebar'
import { Progress } from '@/components/Progress'
import type { Surface, TextureStyle } from '@/domains/interior-designer'
import {
  MaterialGenerationMode,
  MaterialGenerationStage,
  MaterialOperationMetaKey,
} from '@/domains/interior-designer/constants/surface-material-generation'
import { Check, ChevronDown, Loader2, Palette, RotateCcw, Wand2, X } from 'lucide-react'
import { cn } from '@/shared/data/utils'
import {
  getMaterialGenerationStageLabel,
  MATERIAL_3D_PRESETS,
  PROMPT_PRESETS,
  STYLE_OPTIONS,
} from './constants/surface-properties-presets'

interface MaterialGenerationSectionProps {
  selectedSurface: Surface
  mode: MaterialGenerationMode.TwoD | MaterialGenerationMode.ThreeD
  prompt: string
  style: TextureStyle
  isGenerating: boolean
  isStarting3D: boolean
  showPresets: boolean
  error: string | null
  isGenerating3D: boolean
  is3DComplete: boolean
  is3DFailed: boolean
  operationMeta: Record<string, unknown> | null
  onPromptChange: (value: string) => void
  onStyleChange: (value: TextureStyle) => void
  onTogglePresets: () => void
  onSelectPreset: (value: string) => void
  onGenerate2D: () => void
  onGenerate3D: () => void
  onApply3D: () => void
  onDiscard3D: () => void
  onCancel3D: () => void
}

function readOperationString(meta: Record<string, unknown> | null, key: string): string | undefined {
  const value = meta?.[key]
  return typeof value === 'string' ? value : undefined
}

function readOperationNumber(meta: Record<string, unknown> | null, key: string): number {
  const value = meta?.[key]
  return typeof value === 'number' ? value : 0
}

const MaterialGenerationProgressPanel: React.FC<{
  stage: string | undefined
  progress: number
  onCancel: () => void
}> = ({ stage, progress, onCancel }) => (
  <div className="space-y-3 p-4 bg-indigo-500/5 border border-indigo-500/10 rounded-2xl animate-in fade-in slide-in-from-top-2">
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-2">
        <Loader2 className="w-3 h-3 text-indigo-400 animate-spin" />
        <span className="text-[10px] uppercase font-bold tracking-widest text-indigo-300">
          {getMaterialGenerationStageLabel(stage, progress)}
        </span>
      </div>
      <Button
        variant="ghost"
        size="icon"
        className="h-6 w-6 text-zinc-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-all"
        onClick={onCancel}
      >
        <X size={14} />
      </Button>
    </div>
    <div className="space-y-1.5">
      <Progress value={progress} className="h-1 bg-white/5" />
      <div className="flex justify-between text-[9px] text-zinc-500 font-mono">
        <span>{progress}%</span>
        <span>AI RECONSTRUCTING...</span>
      </div>
    </div>
  </div>
)

const MaterialGenerationCompletePanel: React.FC<{
  thumbnailUrl: string | undefined
  onApply: () => void
  onDiscard: () => void
}> = ({ thumbnailUrl, onApply, onDiscard }) => (
  <div className="space-y-3 animate-in fade-in">
    <div className="flex items-center gap-2 text-green-500">
      <Check size={14} />
      <span className="text-xs font-mono font-medium">3D Material Ready</span>
    </div>
    {thumbnailUrl && (
      <div className="relative aspect-square rounded overflow-hidden border border-border bg-muted/20">
        <img src={thumbnailUrl} alt="Generated 3D Preview" className="w-full h-full object-cover" />
      </div>
    )}
    <div className="flex gap-2">
      <Button onClick={onApply} className="flex-1 font-mono text-xs" size="sm">
        <Check size={12} className="mr-1.5" />
        Apply
      </Button>
      <Button variant="outline" onClick={onDiscard} className="flex-1 font-mono text-xs" size="sm">
        <X size={12} className="mr-1.5" />
        Discard
      </Button>
    </div>
  </div>
)

const MaterialGenerationFailedPanel: React.FC<{
  operationError: string | undefined
  onDiscard: () => void
}> = ({ operationError, onDiscard }) => (
  <div className="space-y-3 p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
    <div className="flex items-center gap-2 text-red-500">
      <X size={14} />
      <span className="text-xs font-mono font-medium">Generation Failed</span>
    </div>
    <p className="text-[10px] text-muted-foreground font-mono">
      {operationError || 'An error occurred during generation.'}
    </p>
    <Button variant="outline" size="sm" onClick={onDiscard} className="w-full font-mono text-xs">
      <RotateCcw size={12} className="mr-1.5" />
      Try Again
    </Button>
  </div>
)

const MaterialGenerationInputPanel: React.FC<
  Pick<
    MaterialGenerationSectionProps,
    | 'selectedSurface'
    | 'mode'
    | 'prompt'
    | 'style'
    | 'isGenerating'
    | 'isStarting3D'
    | 'showPresets'
    | 'onPromptChange'
    | 'onStyleChange'
    | 'onTogglePresets'
    | 'onSelectPreset'
    | 'onGenerate2D'
    | 'onGenerate3D'
  >
> = ({
  selectedSurface,
  mode,
  prompt,
  style,
  isGenerating,
  isStarting3D,
  showPresets,
  onPromptChange,
  onStyleChange,
  onTogglePresets,
  onSelectPreset,
  onGenerate2D,
  onGenerate3D,
}) => {
  const presets =
    mode === MaterialGenerationMode.TwoD ? PROMPT_PRESETS : MATERIAL_3D_PRESETS
  const isTwoD = mode === MaterialGenerationMode.TwoD
  const isBusy = isTwoD ? isGenerating : isStarting3D

  return (
    <>
      {isTwoD && (
        <div className="flex flex-wrap gap-1.5 mb-4">
          {STYLE_OPTIONS.map(opt => (
            <button
              key={opt.value}
              onClick={() => onStyleChange(opt.value)}
              className={cn(
                'flex-1 py-2 px-3 rounded-2xl text-[10px] font-bold uppercase tracking-widest transition-all duration-300 border',
                style === opt.value
                  ? 'bg-indigo-600 text-white border-indigo-600 shadow-[0_0_15px_rgba(79,70,229,0.3)]'
                  : 'bg-white/5 text-zinc-500 border-white/5 hover:text-zinc-300 hover:bg-white/10 hover:border-white/10'
              )}
            >
              {opt.label}
            </button>
          ))}
        </div>
      )}

      <div className="relative mb-3 group">
        <Input
          placeholder={isTwoD ? 'Describe texture...' : 'Describe object...'}
          value={prompt}
          onChange={e => onPromptChange(e.target.value)}
          disabled={isBusy}
          className="pr-10 bg-white/5 border-white/10 rounded-2xl focus:ring-indigo-500/30 focus:border-indigo-500/50 transition-all text-[11px] h-10"
        />
        <div className="absolute right-1.5 top-1/2 -translate-y-1/2">
          <Button
            size="icon"
            onClick={isTwoD ? onGenerate2D : onGenerate3D}
            disabled={isBusy || !prompt}
            className={cn(
              'h-7 w-7 rounded-xl transition-all shadow-lg',
              prompt
                ? 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-[0_0_15px_rgba(79,70,229,0.3)]'
                : 'bg-zinc-800 text-zinc-600 shadow-none'
            )}
          >
            {isBusy ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Wand2 className="h-3.5 w-3.5" />
            )}
          </Button>
        </div>
      </div>

      <div className="relative mb-3">
        <button
          onClick={onTogglePresets}
          className="w-full flex items-center justify-between py-2.5 px-4 rounded-2xl bg-white/3 border border-white/5 text-[10px] uppercase font-bold tracking-widest text-zinc-500 hover:text-zinc-300 hover:bg-white/5 transition-all shadow-sm"
        >
          <span>Quick Presets</span>
          <ChevronDown
            size={14}
            className={cn('transition-transform duration-300', showPresets && 'rotate-180')}
          />
        </button>
        {showPresets && (
          <div className="absolute top-full left-0 right-0 mt-2 z-20 p-3 rounded-2xl bg-zinc-900/90 backdrop-blur-xl border border-white/10 shadow-2xl animate-in fade-in slide-in-from-top-2 duration-300">
            <div className="flex flex-wrap gap-2">
              {presets[selectedSurface.type]?.map(p => (
                <button
                  key={p}
                  onClick={() => onSelectPreset(p)}
                  className="text-[9px] px-3 py-1.5 rounded-xl bg-white/5 border border-white/5 hover:border-indigo-500/50 hover:bg-indigo-500/10 hover:text-indigo-300 transition-all font-bold uppercase tracking-tighter"
                >
                  {p}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="text-[9px] text-zinc-500 italic leading-snug px-3 py-2 bg-white/2 border border-white/5 rounded-2xl">
        {isTwoD
          ? 'Generates a repeatable PBR texture using AI.'
          : 'Generates a fully detailed 3D model. Takes 2-5 minutes.'}
      </div>
    </>
  )
}

export const SurfaceMaterialGenerationSection: React.FC<MaterialGenerationSectionProps> = ({
  selectedSurface,
  mode,
  prompt,
  style,
  isGenerating,
  isStarting3D,
  showPresets,
  error,
  isGenerating3D,
  is3DComplete,
  is3DFailed,
  operationMeta,
  onPromptChange,
  onStyleChange,
  onTogglePresets,
  onSelectPreset,
  onGenerate2D,
  onGenerate3D,
  onApply3D,
  onDiscard3D,
  onCancel3D,
}) => {
  const modelUrl = readOperationString(operationMeta, MaterialOperationMetaKey.ModelUrl)
  const thumbnailUrl = readOperationString(operationMeta, MaterialOperationMetaKey.ThumbnailUrl)
  const stage = readOperationString(operationMeta, MaterialOperationMetaKey.Stage)
  const progress = readOperationNumber(operationMeta, MaterialOperationMetaKey.Progress)
  const operationError = readOperationString(operationMeta, MaterialOperationMetaKey.Error)
  const showInput = !(isGenerating3D || is3DComplete || is3DFailed)

  return (
    <SidebarSection title="AI Material (Meshy)" icon={<Palette size={12} />} separator>
      {mode === MaterialGenerationMode.ThreeD && isGenerating3D && (
        <MaterialGenerationProgressPanel
          stage={stage}
          progress={progress}
          onCancel={onCancel3D}
        />
      )}

      {mode === MaterialGenerationMode.ThreeD && is3DComplete && modelUrl && (
        <MaterialGenerationCompletePanel
          thumbnailUrl={thumbnailUrl}
          onApply={onApply3D}
          onDiscard={onDiscard3D}
        />
      )}

      {mode === MaterialGenerationMode.ThreeD && is3DFailed && (
        <MaterialGenerationFailedPanel operationError={operationError} onDiscard={onDiscard3D} />
      )}

      {showInput && (
        <MaterialGenerationInputPanel
          selectedSurface={selectedSurface}
          mode={mode}
          prompt={prompt}
          style={style}
          isGenerating={isGenerating}
          isStarting3D={isStarting3D}
          showPresets={showPresets}
          onPromptChange={onPromptChange}
          onStyleChange={onStyleChange}
          onTogglePresets={onTogglePresets}
          onSelectPreset={onSelectPreset}
          onGenerate2D={onGenerate2D}
          onGenerate3D={onGenerate3D}
        />
      )}

      {error && (
        <div className="text-xs text-red-500 bg-red-500/10 border border-red-500/20 p-3 rounded mb-3 font-mono">
          {error}
        </div>
      )}
    </SidebarSection>
  )
}

export { MaterialGenerationStage }
