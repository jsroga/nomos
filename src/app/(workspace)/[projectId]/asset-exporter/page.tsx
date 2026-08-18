'use client'

import { useState } from 'react'
import { AssetExporterLayout } from '@/domains/3d-asset-exporter'
import { SettingsDialog, useThreeDAssetsLibrary, useWorldStore } from '@/domains/2d-canvas'
import { useProjectFromUrl } from '@/components/shell/useProjectFromUrl'
import { useAuthStore } from '@/shared/auth/useAuthStore'
import { useWorkspaceProjectStore } from '@/shared/workspace/workspace-project-store'

export default function AssetExporterPage() {
  useProjectFromUrl()

  const currentProject = useWorkspaceProjectStore(state => state.currentProject)
  const assets = useWorldStore(state => state.assets)
  const previewAssetId = useWorldStore(state => state.previewAssetId)
  const setPreviewAssetId = useWorldStore(state => state.setPreviewAssetId)
  const updateAsset = useWorldStore(state => state.updateAsset)
  const fetchAssets = useWorldStore(state => state.fetchAssets)
  const user = useAuthStore(state => state.user)
  const [isSettingsOpen, setIsSettingsOpen] = useState(false)
  const assetsBind = useThreeDAssetsLibrary()

  return (
    <AssetExporterLayout
      currentProject={currentProject}
      assets={assets}
      previewAssetId={previewAssetId}
      setPreviewAssetId={setPreviewAssetId}
      updateAsset={updateAsset}
      fetchAssets={fetchAssets}
      user={user}
      assetsBind={assetsBind}
      settingsDialog={
        <SettingsDialog isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} />
      }
    />
  )
}
