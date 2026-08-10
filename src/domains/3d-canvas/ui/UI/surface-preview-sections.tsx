'use client'

import React from 'react'
import type { Surface } from '@/domains/3d-canvas'
import { Check, Sparkles, Trash2 } from 'lucide-react'
import { Button } from '@/components/Button'
import { SidebarSection, SidebarLabel } from '@/components/DomainSidebar'
import { MaterialGenerationMode } from '@/domains/3d-canvas/constants/surface-material-generation'
import { LabeledSlider } from './surface-properties-sections'

interface SurfacePreviewSectionsProps {
  mode: MaterialGenerationMode.TwoD | MaterialGenerationMode.ThreeD
  previewUrl: string | null
  selectedSurface: Surface
  scale: number
  onApply2D: () => void
  onScaleChange: (value: number) => void
  onUpdateSurface: (updates: Partial<Surface>) => void
}

export const SurfacePreviewSections: React.FC<SurfacePreviewSectionsProps> = ({
  mode,
  previewUrl,
  selectedSurface,
  scale,
  onApply2D,
  onScaleChange,
  onUpdateSurface,
}) => (
  <>
    {mode === MaterialGenerationMode.TwoD && previewUrl && (
      <SidebarSection
        title="Generated Result"
        icon={<Sparkles size={12} />}
        className="animate-in fade-in zoom-in-95 duration-500"
        separator
      >
        <div className="space-y-4">
          <div className="relative aspect-square rounded-2xl overflow-hidden border border-white/10 shadow-2xl group cursor-pointer bg-white/5">
            <img
              src={previewUrl}
              alt="Preview"
              className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-4">
              <span className="text-[10px] font-bold uppercase tracking-widest text-white/80">
                Texture Preview
              </span>
            </div>
          </div>
          <Button
            onClick={onApply2D}
            className="w-full h-10 rounded-xl bg-indigo-500 hover:bg-indigo-400 text-white font-bold uppercase tracking-widest text-[10px] shadow-lg shadow-indigo-500/20 transition-all border-none"
          >
            <Check size={14} className="mr-2" />
            Apply Material
          </Button>
        </div>
      </SidebarSection>
    )}

    {selectedSurface.texture && !previewUrl && (
      <SidebarSection title="Material Properties" icon={<Sparkles size={12} />} separator>
        <div className="flex gap-3 mb-4">
          <div className="w-20 h-20 shrink-0 rounded-xl overflow-hidden border border-white/10 bg-white/5">
            <img
              src={selectedSurface.texture}
              alt="Current"
              className="w-full h-full object-cover"
            />
          </div>
          <div className="flex-1 space-y-4">
            <div className="space-y-2">
              <SidebarLabel className="text-zinc-400 font-semibold text-[11px]">
                Texture Scale
              </SidebarLabel>
              <LabeledSlider
                label=""
                value={scale}
                onChange={value => {
                  onScaleChange(value)
                  onUpdateSurface({ textureScale: value })
                }}
                min={0.1}
                max={5.0}
                step={0.1}
                unit="x"
              />
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="w-full justify-start text-[10px] font-bold uppercase tracking-widest text-red-400 hover:text-red-300 hover:bg-red-500/10 h-8 rounded-lg transition-all"
              onClick={() => onUpdateSurface({ texture: undefined })}
            >
              <Trash2 className="w-3.3 h-3.3 mr-2" />
              Remove Material
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 pt-2">
          <div className="space-y-2">
            <SidebarLabel className="text-zinc-400 font-semibold text-[11px]">
              Roughness
            </SidebarLabel>
            <LabeledSlider
              label=""
              value={selectedSurface.roughness ?? 0.8}
              onChange={v => onUpdateSurface({ roughness: v })}
              min={0}
              max={1}
              step={0.1}
            />
          </div>
          <div className="space-y-2">
            <SidebarLabel className="text-zinc-400 font-semibold text-[11px]">
              Metalness
            </SidebarLabel>
            <LabeledSlider
              label=""
              value={selectedSurface.metalness ?? 0}
              onChange={v => onUpdateSurface({ metalness: v })}
              min={0}
              max={1}
              step={0.1}
            />
          </div>
        </div>
      </SidebarSection>
    )}
  </>
)
