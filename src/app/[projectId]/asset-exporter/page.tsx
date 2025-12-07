'use client'

import { AssetExporterSidebar } from '@/domains/3d-asset-exporter/components/AssetExporterSidebar'
import { useWorldStore } from '@/domains/world-building-toolkit/store/useWorldStore'
import { AssetEditor } from '@/domains/3d-asset-exporter/components/AssetEditor'
import { ThreeDPanel } from '@/domains/3d-asset-exporter/components/ThreeDPanel'
import { Box } from 'lucide-react'
import { useProjectFromUrl } from '@/hooks/useProjectFromUrl'

export default function AssetExporterPage() {
  // Load project from URL
  useProjectFromUrl()

  const currentProject = useWorldStore(state => state.currentProject)
  const assets = useWorldStore(state => state.assets)
  const previewAssetId = useWorldStore(state => state.previewAssetId)

  const selectedAsset = assets.find(a => a.id === previewAssetId)

  return (
    <div className="flex h-full w-full overflow-hidden bg-background text-foreground">
      <AssetExporterSidebar />
      <div className="flex-1 relative flex flex-col bg-muted/10 overflow-hidden">
        {selectedAsset && currentProject ? (
          <div className="grid grid-cols-2 gap-6 h-full">
            {/* 2D Asset View / Editor */}
            <AssetEditor 
                key={`editor-${selectedAsset.id}`} // Force remount on asset change
                assetId={selectedAsset.id}
                imageUrl={`/projects/${currentProject.id}/assets/${selectedAsset.image_filename}`}
            />

            {/* 3D Preview Panel */}
            <ThreeDPanel
                key={`3d-${selectedAsset.id}`}
                assetId={selectedAsset.id}
                imageUrl={`/projects/${currentProject.id}/assets/${selectedAsset.image_filename}`}
                initialModelUrl={
                    selectedAsset.model_filename 
                  ? selectedAsset.model_filename.startsWith('http://') || selectedAsset.model_filename.startsWith('https://')
                    ? selectedAsset.model_filename // External URL - use as-is
                    : `/projects/${currentProject.id}/assets/${selectedAsset.model_filename}` // Local file
                    : undefined
                }
            />
          </div>
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center space-y-4 max-w-md">
              <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto">
                 <Box size={32} className="text-muted-foreground opacity-50" />
              </div>
              <h2 className="text-2xl font-bold text-muted-foreground">No Asset Selected</h2>
              <p className="text-muted-foreground">
                Select an exported asset from the sidebar to view details and generate 3D models.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
