import React from 'react'
import { Plus, Eye, EyeOff, Package } from 'lucide-react'
import { TooltipProvider } from '@/components/Tooltip'
import { SidebarSection, SidebarEmptyState } from '@/components/DomainSidebar'
import { AssetsPanel } from '@/domains/2d-canvas/ui/components/AssetsPanel'
import { MjVariantPicker } from '@/domains/2d-canvas/ui/components/MjVariantPicker'
import type { WorldGenSidebarState } from '@/domains/2d-canvas/state/hooks/useWorldGenSidebar'
import { SidebarWorldSection } from './SidebarWorldSection'
import { SidebarGenerationSection } from './SidebarGenerationSection'
import { SidebarUpscaleSection } from './SidebarUpscaleSection'
import { SidebarFidelitySection } from './SidebarFidelitySection'
import { generationModeDef } from '@/domains/2d-canvas/constants/generation-modes'

export const SidebarContent: React.FC<WorldGenSidebarState> = sidebar => {
  const { currentProject, assets, showAllAssetMasks, setShowAllAssetMasks, error, mjGridData, setMjGridData } =
    sidebar

  return (
    <TooltipProvider>
      {!currentProject ? (
        <SidebarEmptyState
          icon={<Plus size={24} className="opacity-50" />}
          message="Please select or create a project to start."
        />
      ) : (
        <div className="space-y-6">
          {error && (
            <div className="p-3 bg-destructive/10 text-destructive text-sm rounded-md border border-destructive/20">
              {error}
            </div>
          )}

          <SidebarWorldSection {...sidebar} />
          <SidebarGenerationSection {...sidebar} />
          <SidebarUpscaleSection {...sidebar} />
          {generationModeDef(sidebar.generationMode).allowsFidelityEnhance ? (
            <SidebarFidelitySection {...sidebar} />
          ) : null}

          <SidebarSection
            separator
            title="Assets"
            icon={<Package size={12} />}
            rightContent={
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono text-muted-foreground">{assets.length}</span>
                <button
                  onClick={e => {
                    e.stopPropagation()
                    setShowAllAssetMasks(!showAllAssetMasks)
                  }}
                  className="text-muted-foreground hover:text-foreground transition-colors"
                >
                  {showAllAssetMasks ? <EyeOff size={12} /> : <Eye size={12} />}
                </button>
              </div>
            }
          >
            <AssetsPanel />
          </SidebarSection>
        </div>
      )}

      {mjGridData && (
        <MjVariantPicker
          tileId={mjGridData.tileId}
          tileX={mjGridData.tileX}
          tileY={mjGridData.tileY}
          gridImageUrl={mjGridData.gridImageUrl}
          buttons={mjGridData.buttons}
          taskId={mjGridData.taskId}
          onClose={() => setMjGridData(null)}
          onSelected={() => setMjGridData(null)}
        />
      )}
    </TooltipProvider>
  )
}
