'use client'

import React, { useEffect } from 'react'
import { useInteriorStore } from '@/domains/interior-designer/store/useInteriorStore'
import { useWorldStore } from '@/domains/world-building-toolkit/store/useWorldStore'
import { ProjectAssetLibrary } from '@/components/assets/ProjectAssetLibrary'

export const AssetLibrary: React.FC = () => {
  const activeModelUrl = useInteriorStore(state => state.activeModelUrl)
  const setActiveModelUrl = useInteriorStore(state => state.setActiveModelUrl)
  const mode = useInteriorStore(state => state.mode)
  const setMode = useInteriorStore(state => state.setMode)

  const currentProject = useWorldStore(state => state.currentProject)
  const assets = useWorldStore(state => state.assets)
  const fetchAssets = useWorldStore(state => state.fetchAssets)
  const [loading, setLoading] = React.useState(false)

  // Load 3D assets when project changes
  useEffect(() => {
    if (currentProject) {
      fetchAssets() // fetchAssets inside store might already handle loading state internally or we wrap it
    }
  }, [currentProject, fetchAssets])

  const handleRefresh = async () => {
    setLoading(true)
    await fetchAssets()
    setLoading(false)
  }

  const isObjectMode = mode === 'OBJECT' || mode === 'SCATTER'

  return (
    <div className="h-full overflow-hidden">
      <ProjectAssetLibrary
        assets={assets}
        currentProjectId={currentProject?.id}
        activeAssetId={activeModelUrl}
        onSelectAsset={(url, is3D) => {
          if (is3D) {
            setActiveModelUrl(url)
            if (!isObjectMode) {
              setMode('OBJECT') // Auto-switch mode for convenience
            }
          }
        }}
        onRefresh={handleRefresh}
        isSelectMode={true} // Always allow selection here
        isLoading={loading}
        className="border-0" // Override border if needed, but original had it.
      />
    </div>
  )
}
