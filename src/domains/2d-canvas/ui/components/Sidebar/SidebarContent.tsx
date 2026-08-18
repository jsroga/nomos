import React from 'react'
import { Eye, EyeOff, Plus } from 'lucide-react'
import { TooltipProvider } from '@/components/Tooltip'
import { Button } from '@/components/Button'
import { SidebarEmptyState } from '@/components/DomainSidebar'
import { ThreeDAssets, ThreeDAssetsCopy } from '@/components/ThreeDAssets'
import { MjVariantPicker } from '@/domains/2d-canvas/ui/components/MjVariantPicker'
import type { WorldGenSidebarState } from '@/domains/2d-canvas/state/hooks/useWorldGenSidebar'
import { useThreeDAssetsLibrary } from '@/domains/2d-canvas/state/hooks/useThreeDAssetsLibrary'
import { WorldGenSidebarClass } from '../../constants/sidebar'
import { SidebarWorldSection } from './SidebarWorldSection'
import { SidebarGenerationDebugPanel } from './SidebarGenerationDebugPanel'

export const SidebarContent: React.FC<WorldGenSidebarState> = sidebar => {
  const {
    currentProject,
    error,
    mjGridData,
    setMjGridData,
    isDebugMode,
    generationDebugInfo,
    showDebug,
    setShowDebug,
    setGenerationDebugInfo,
  } = sidebar
  const assets = useThreeDAssetsLibrary()

  return (
    <TooltipProvider>
      {!currentProject ? (
        <SidebarEmptyState
          icon={<Plus size={24} className="opacity-50" />}
          message="Please select or create a project to start."
        />
      ) : (
        <div>
          {error && (
            <div className="p-3 mb-6 bg-destructive/10 text-destructive text-sm rounded-md border border-destructive/20">
              {error}
            </div>
          )}

          <SidebarWorldSection {...sidebar} />

          {isDebugMode && generationDebugInfo ? (
            <div className="space-y-2 mt-6">
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="h-6 text-xs gap-1 font-mono"
                  onClick={() => setShowDebug(!showDebug)}
                >
                  {showDebug ? <EyeOff size={12} /> : <Eye size={12} />}
                  Debug
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-6 text-xs font-mono"
                  onClick={() => setGenerationDebugInfo(null)}
                >
                  Clear
                </Button>
              </div>
              {showDebug ? <SidebarGenerationDebugPanel debug={generationDebugInfo} /> : null}
            </div>
          ) : null}

          <div className={WorldGenSidebarClass.Divider} />
          <ThreeDAssets
            items={assets.items}
            onRemove={assets.onRemove}
            onSelect={assets.onSelect}
            onDownload={assets.onDownload}
            count={assets.count}
            showEye={assets.showEye}
            eyeOn={assets.eyeOn}
            onToggleEye={assets.onToggleEye}
            liveMessage={assets.liveMessage}
            allowUpload={false}
            emptyHelper={ThreeDAssetsCopy.PreviewEmptyHelper}
          />
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
