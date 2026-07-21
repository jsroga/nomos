'use client'

import { useState } from 'react'
import { AssetExporterLayout } from '@/domains/3d-asset-exporter'
import {
  AssetsPanel,
  SettingsDialog,
  useWorldStore,
} from '@/domains/world-building-toolkit'
import { useProjectFromUrl } from '@/components/shell/useProjectFromUrl'
import { useAuthStore } from '@/shared/auth/useAuthStore'
import { useWorkspaceProjectStore } from '@/shared/workspace/workspace-project-store'

export default function AssetExporterPage() {
  useProjectFromUrl()

  const currentProject = useWorkspaceProjectStore(state => state.currentProject)
  const assets = useWorldStore(state => state.assets)
  const previewAssetId = useWorldStore(state => state.previewAssetId)
  const setPreviewAssetId = useWorldStore(state => state.setPreviewAssetId)
  const showAllAssetMasks = useWorldStore(state => state.showAllAssetMasks)
  const setShowAllAssetMasks = useWorldStore(state => state.setShowAllAssetMasks)
  const updateAsset = useWorldStore(state => state.updateAsset)
  const fetchAssets = useWorldStore(state => state.fetchAssets)
  const user = useAuthStore(state => state.user)
  const [isSettingsOpen, setIsSettingsOpen] = useState(false)

  return (
    <AssetExporterLayout
      currentProject={currentProject}
      assets={assets}
      previewAssetId={previewAssetId}
      setPreviewAssetId={setPreviewAssetId}
      showAllAssetMasks={showAllAssetMasks}
      setShowAllAssetMasks={setShowAllAssetMasks}
      updateAsset={updateAsset}
      fetchAssets={fetchAssets}
      user={user}
      assetsPanel={<AssetsPanel showHelpText={false} />}
      settingsDialog={
        <SettingsDialog isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} />
      }
    />
  )
}
