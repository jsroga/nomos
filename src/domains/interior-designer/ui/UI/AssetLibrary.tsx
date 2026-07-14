'use client'

import React from 'react'
import { useInteriorStore } from '@/domains/interior-designer'
import { useWorldStore } from '@/domains/world-building-toolkit'
import { AssetsPanel } from '@/domains/world-building-toolkit/ui/AssetsPanel'
import { AssetUploadZone } from '@/domains/3d-asset-exporter'
import { Box, Circle, Cylinder, Cone, LayoutGrid, DoorOpen } from 'lucide-react'
import { cn } from '@/shared/data/utils'
import {
  INTERACTION_MODE_OBJECT,
  INTERACTION_MODE_SCATTER,
  PRIMITIVE_ASSETS,
  PrimitiveAssetId,
} from '@/domains/interior-designer/constants/asset-library'

const PRIMITIVE_ICONS = {
  [PrimitiveAssetId.Cube]: Box,
  [PrimitiveAssetId.Sphere]: Circle,
  [PrimitiveAssetId.Cylinder]: Cylinder,
  [PrimitiveAssetId.Cone]: Cone,
  [PrimitiveAssetId.Window]: LayoutGrid,
  [PrimitiveAssetId.Door]: DoorOpen,
} as const

export const AssetLibrary: React.FC = () => {
  const activeModelUrl = useInteriorStore(state => state.activeModelUrl)
  const setActiveModelUrl = useInteriorStore(state => state.setActiveModelUrl)
  const mode = useInteriorStore(state => state.mode)
  const setMode = useInteriorStore(state => state.setMode)

  const currentProject = useWorldStore(state => state.currentProject)

  const isObjectMode = mode === INTERACTION_MODE_OBJECT || mode === INTERACTION_MODE_SCATTER

  const handleSelectAsset = (url: string, is3D: boolean) => {
    if (is3D) {
      setActiveModelUrl(url)
      if (!isObjectMode) {
        setMode(INTERACTION_MODE_OBJECT)
      }
    }
  }

  return (
    <div className="h-full space-y-6 pb-8 pr-1">
      {currentProject ? (
        <>
          <div>
            <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-500 mb-3 px-1 block">
              Foundations
            </span>
            <div className="grid grid-cols-3 gap-2">
              {PRIMITIVE_ASSETS.map(prim => {
                const isSelected = activeModelUrl === prim.id
                const Icon = PRIMITIVE_ICONS[prim.id]
                return (
                  <button
                    key={prim.id}
                    onClick={() => handleSelectAsset(prim.id, true)}
                    className={cn(
                      'h-14 flex flex-col items-center justify-center gap-1 rounded-lg border transition-all duration-200 group relative',
                      isSelected
                        ? 'bg-indigo-600 border-indigo-500 text-white shadow-lg shadow-indigo-500/30 -translate-y-0.5'
                        : 'bg-zinc-900/50 border-zinc-700/50 text-zinc-400 hover:text-white hover:bg-indigo-600/20 hover:border-indigo-500 hover:-translate-y-0.5'
                    )}
                  >
                    <Icon
                      size={16}
                      className={cn(
                        'transition-all duration-200',
                        isSelected ? 'text-white' : 'text-zinc-500 group-hover:text-indigo-400'
                      )}
                    />
                    <span className="text-[7px] font-semibold uppercase tracking-wide">
                      {prim.name}
                    </span>
                  </button>
                )
              })}
            </div>
          </div>

          <div className="space-y-3">
            <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-500 px-1 block">
              Custom Assets
            </span>
            <AssetUploadZone
              projectId={currentProject.id}
              onUploadComplete={() => {
                const fetchAssets = useWorldStore.getState().fetchAssets
                if (fetchAssets) {
                  fetchAssets()
                }
              }}
            />

            <AssetsPanel showHelpText={false} onSelectAsset={handleSelectAsset} />
          </div>
        </>
      ) : (
        <div className="text-sm text-muted-foreground text-center py-8">
          Please select a project to view and upload assets.
        </div>
      )}
    </div>
  )
}
