'use client'

import React, { useState } from 'react'
import { useWorldStore } from '@/domains/world-building-toolkit'
import { AssetsPanel } from '@/domains/world-building-toolkit/ui/AssetsPanel'
import { SettingsDialog } from '@/domains/world-building-toolkit/ui/SettingsDialog'
import { AssetUploadZone } from './AssetUploadZone'
import { Plus, Palette, Package, Info, Eye, EyeOff } from 'lucide-react'
import { LocalStorageKeys } from '@/constants/localStorage'
import { DomainSidebar, SidebarSection, SidebarEmptyState } from '@/components/ui/domain-sidebar'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { TOUR_STEP_IDS } from '@/lib/tour-constants'

export const AssetExporterSidebar: React.FC = () => {
  const defaultMasterPrompt = ''

  const [masterPrompt, setMasterPrompt] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem(LocalStorageKeys.MASTER_PROMPT) || defaultMasterPrompt
    }
    return defaultMasterPrompt
  })

  const [isSettingsOpen, setIsSettingsOpen] = useState(false)

  const currentProject = useWorldStore(state => state.currentProject)
  const assets = useWorldStore(state => state.assets)
  const showAllAssetMasks = useWorldStore(state => state.showAllAssetMasks)
  const setShowAllAssetMasks = useWorldStore(state => state.setShowAllAssetMasks)

  // Save master prompt to localStorage when it changes
  const handleMasterPromptChange = (value: string) => {
    setMasterPrompt(value)
    if (typeof window !== 'undefined') {
      localStorage.setItem(LocalStorageKeys.MASTER_PROMPT, value)
    }
  }

  return (
    <TooltipProvider>
      <DomainSidebar header="Asset Exporter" storageKey="asset-exporter">
        {currentProject ? (
          <div className="space-y-6">
            {/* Master Prompt */}
            <div id={TOUR_STEP_IDS.ASSET_MASTER_PROMPT}>
            <SidebarSection
              title="Master Prompt (Style)"
              icon={<Palette size={12} />}
              rightContent={
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Info size={12} className="text-muted-foreground/60 cursor-help" />
                  </TooltipTrigger>
                  <TooltipContent side="right">
                    <p className="max-w-[200px]">
                      Define the overall art style that will be applied to all generated 3D assets
                    </p>
                  </TooltipContent>
                </Tooltip>
              }
            >
              <textarea
                value={masterPrompt}
                onChange={e => handleMasterPromptChange(e.target.value)}
                placeholder="Define the overall art style and aesthetic..."
                className="w-full h-24 bg-background/50 border-2 border-border/60 rounded-md p-3 text-sm resize-none hover:border-border transition-colors focus:border-primary focus:ring-1 focus:ring-primary/30 focus:outline-none placeholder:text-muted-foreground/60 disabled:opacity-50 disabled:cursor-not-allowed disabled:bg-muted/30"
              />
              <p className="text-xs text-muted-foreground mt-2">
                This style will be applied to generated assets
              </p>
            </SidebarSection>
            </div>

            {/* Assets */}
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
              {/* Upload Zone */}
              <div className="mb-4" id={TOUR_STEP_IDS.ASSET_UPLOAD_ZONE}>
                <AssetUploadZone
                  projectId={currentProject.id}
                  onUploadComplete={assetIds => {
                    // Refresh assets list after upload
                    const fetchAssets = useWorldStore.getState().fetchAssets
                    if (fetchAssets) {
                      fetchAssets()
                    }
                  }}
                />
              </div>

              <AssetsPanel showHelpText={false} />
            </SidebarSection>
          </div>
        ) : (
          <SidebarEmptyState
            icon={<Plus size={24} className="opacity-50" />}
            message="Please select or create a project to start."
          />
        )}

        <SettingsDialog isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} />
      </DomainSidebar>
    </TooltipProvider>
  )
}
