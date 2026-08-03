'use client'

import { Check, Loader2, Sparkles, Wand2, X } from 'lucide-react'
import { Button } from '@/components/Button'
import { Input } from '@/components/Input'
import { Slider } from '@/components/Slider'
import { SidebarLabel, SidebarSection } from '@/components/DomainSidebar'
import type { SceneObject } from '@/domains/3d-canvas'
import {
  PropertiesPanelStatusLabel,
} from '@/domains/3d-canvas/constants/properties-panel'
import {
  AsyncOperationStatus,
} from '@/shared/jobs/constants/async-operation-status'
import type { AsyncOperation } from '@/shared/jobs/useGlobalStatusStore'

interface RetextureCompletedViewProps {
  object: SceneObject | undefined
  onApprove: () => void
  onCancel: () => void
  onScaleChange: (val: number[]) => void
}

export function RetextureCompletedView({
  object,
  onApprove,
  onCancel,
  onScaleChange,
}: RetextureCompletedViewProps) {
  return (
    <div className="pt-4 border-t border-zinc-800 animate-in fade-in space-y-3">
      <h3 className="text-xs font-mono font-bold uppercase tracking-wide mb-2 flex items-center gap-2 text-primary">
        <Sparkles size={12} />
        Review Result
      </h3>
      <div className="bg-zinc-950/30 p-2 rounded text-xs border border-zinc-800/30">
        New texture generated. Adjust scale if needed.
      </div>

      <div className="space-y-1">
        <div className="flex justify-between text-[10px] font-medium text-muted-foreground">
          <label className="font-mono uppercase tracking-wide text-[10px]">Size Correction</label>
          <span>{object?.scale[0].toFixed(2)}x</span>
        </div>
        <Slider
          min={0.1}
          max={5}
          step={0.1}
          value={[object?.scale[0] || 1]}
          onValueChange={onScaleChange}
        />
      </div>

      <div className="flex gap-2">
        <Button onClick={onApprove} size="sm" className="flex-1 h-8 text-xs font-mono">
          <Check size={12} className="mr-1.5" /> Apply
        </Button>
        <Button
          onClick={onCancel}
          size="sm"
          variant="ghost"
          className="flex-1 h-8 text-xs font-mono text-destructive hover:text-destructive hover:bg-destructive/10"
        >
          <X size={12} className="mr-1.5" /> Discard
        </Button>
      </div>
    </div>
  )
}

interface RetextureActiveViewProps {
  currentOperation: AsyncOperation
}

export function RetextureActiveView({ currentOperation }: RetextureActiveViewProps) {
  const statusLabel =
    currentOperation.status === AsyncOperationStatus.Pending
      ? PropertiesPanelStatusLabel.StartingJob
      : PropertiesPanelStatusLabel.GeneratingTexture

  return (
    <div className="pt-4 border-t border-zinc-800">
      <div className="flex flex-col items-center justify-center p-4 bg-zinc-950/20 rounded gap-2">
        <Loader2 className="animate-spin text-primary" size={20} />
        <span className="text-xs font-mono text-muted-foreground">{statusLabel}</span>
      </div>
    </div>
  )
}

interface RetextureFailedViewProps {
  onClear: () => void
}

export function RetextureFailedView({ onClear }: RetextureFailedViewProps) {
  return (
    <div className="pt-4 border-t border-zinc-800">
      <div className="bg-destructive/10 border border-destructive/20 p-3 rounded text-xs">
        <p className="font-semibold text-destructive mb-1">Retexture Failed</p>
        <p className="text-muted-foreground mb-2">
          An error occurred while generating the texture.
        </p>
        <Button onClick={onClear} size="sm" variant="outline" className="w-full">
          Clear Error
        </Button>
      </div>
    </div>
  )
}

interface RetextureFormViewProps {
  prompt: string
  isStarting: boolean
  onPromptChange: (value: string) => void
  onGenerate: () => void
}

export function RetextureFormView({
  prompt,
  isStarting,
  onPromptChange,
  onGenerate,
}: RetextureFormViewProps) {
  return (
    <SidebarSection title="AI Retexture" icon={<Sparkles size={12} />} separator>
      <div className="space-y-2">
        <SidebarLabel>Description</SidebarLabel>
        <Input
          value={prompt}
          onChange={e => onPromptChange(e.target.value)}
          placeholder="Rusty metal, mossy stone..."
          className="text-xs font-mono h-8"
        />
        <Button
          onClick={onGenerate}
          disabled={!prompt || isStarting}
          className="w-full h-8 text-xs font-mono"
          variant="outline"
        >
          {isStarting ? (
            <Loader2 className="mr-2 h-3 w-3 animate-spin" />
          ) : (
            <Wand2 className="mr-2 h-3 w-3" />
          )}
          Generate New Texture
        </Button>
      </div>
    </SidebarSection>
  )
}
