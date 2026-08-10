'use client'

import React from 'react'
import { cn } from '@/shared/data/utils'
import { SidebarLabel } from '@/components/DomainSidebar'
import {
  RENDER_QUALITY_LABELS,
  RENDER_QUALITY_VALUES,
  type RenderQuality,
} from '@/domains/3d-canvas/constants/render-quality'

export const RenderQualityControls: React.FC<{
  renderQuality: RenderQuality
  setRenderQuality: (quality: RenderQuality) => void
}> = ({ renderQuality, setRenderQuality }) => (
  <div className="space-y-3">
    <SidebarLabel className="text-zinc-500 font-bold tracking-tighter text-[10px] uppercase opacity-70">
      Render Quality
    </SidebarLabel>
    <div className="flex gap-2 p-1 bg-black/20 rounded-lg">
      {RENDER_QUALITY_VALUES.map(q => (
        <button
          key={q}
          type="button"
          onClick={() => setRenderQuality(q)}
          className={cn(
            'flex-1 py-1.5 text-[9px] rounded-md font-bold uppercase tracking-tight transition-all',
            renderQuality === q
              ? 'bg-zinc-100 text-zinc-950 shadow-lg'
              : 'text-zinc-600 hover:text-zinc-400'
          )}
        >
          {RENDER_QUALITY_LABELS[q]}
        </button>
      ))}
    </div>
    <p className="text-[9px] text-zinc-600 italic leading-snug px-1">
      Caps shadows, post-FX, and DPR. Quality drops further while orbiting or sculpting.
    </p>
  </div>
)
