'use client'

import React, { useState } from 'react'
import { cn } from '@/shared/data/utils'
import { AssetLibrary } from './AssetLibrary'
import { PropertiesPanel } from './PropertiesPanel'
import { LayerPanel } from './LayerPanel'
import { useInteriorStore } from '@/domains/3d-canvas'
import { Package, Settings, Layers } from 'lucide-react'
import { TOUR_STEP_IDS } from '@/shared/tours/tour-constants'
import { Button } from '@/components/Button'

import {
  INTERACTION_MODE_TERRAIN,
  InteriorSidebarTabId,
  InteriorSidebarTabLabel,
} from '@/domains/3d-canvas/constants/asset-library'

type TabId = InteriorSidebarTabId

export const InteriorRightSidebar: React.FC = () => {
  const mode = useInteriorStore(state => state.mode)
  const [activeTab, setActiveTab] = useState<TabId>(InteriorSidebarTabId.Assets)

  React.useEffect(() => {
    if (mode === INTERACTION_MODE_TERRAIN) {
      setActiveTab(InteriorSidebarTabId.Properties)
    }
  }, [mode])

  const tabs: Array<{ id: TabId; label: string; icon: React.ReactNode; tourId?: string }> = [
    {
      id: InteriorSidebarTabId.Assets,
      label: InteriorSidebarTabLabel.Assets,
      icon: <Package size={12} />,
      tourId: TOUR_STEP_IDS.INTERIOR_ASSETS,
    },
    {
      id: InteriorSidebarTabId.Properties,
      label: mode === INTERACTION_MODE_TERRAIN ? InteriorSidebarTabLabel.Terrain : InteriorSidebarTabLabel.Properties,
      icon: <Settings size={12} />,
      tourId: TOUR_STEP_IDS.INTERIOR_TERRAIN,
    },
    {
      id: InteriorSidebarTabId.Layers,
      label: InteriorSidebarTabLabel.Layers,
      icon: <Layers size={12} />,
    },
  ]

  return (
    <div className="flex flex-col h-full bg-background/60 backdrop-blur-xl overflow-hidden select-none border-l border-border/50">
      {/* Tab Navigation */}
      <div className="flex items-center border-b border-border shrink-0 bg-background/40">
        {tabs.map(tab => (
          <Button
            key={tab.id}
            id={tab.tourId}
            variant="ghost"
            onClick={() => setActiveTab(tab.id)}
            className={cn(
              'flex-1 flex items-center justify-center gap-1.5 px-3 py-2.5 text-[10px] font-mono font-bold uppercase tracking-widest transition-all duration-200 rounded-none h-auto relative',
              activeTab === tab.id
                ? 'text-indigo-400 bg-indigo-500/10'
                : 'text-muted-foreground hover:text-foreground hover:bg-accent/50'
            )}
          >
            {tab.icon}
            <span>{tab.label}</span>
            {activeTab === tab.id && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-indigo-500" />
            )}
          </Button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="flex-1 overflow-hidden relative">
        {/* Assets Tab */}
        {activeTab === 'assets' && (
          <div className="absolute inset-0 overflow-hidden">
            <div className="h-full overflow-y-auto p-4">
              <AssetLibrary />
            </div>
          </div>
        )}

        {/* Properties/Terrain Tab */}
        {activeTab === 'properties' && (
          <div className="absolute inset-0 overflow-hidden">
            <div className="h-full overflow-y-auto p-4">
              <PropertiesPanel />
            </div>
          </div>
        )}

        {/* Layers Tab */}
        {activeTab === 'layers' && (
          <div className="absolute inset-0 overflow-hidden">
            <div className="h-full overflow-y-auto p-4">
              <LayerPanel />
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
