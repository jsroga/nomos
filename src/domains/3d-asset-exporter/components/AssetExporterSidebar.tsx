'use client'

import React, { useState, useEffect } from 'react'
import { useWorldStore } from '@/domains/world-building-toolkit/store/useWorldStore'
import { AssetsPanel } from '@/domains/world-building-toolkit/components/AssetsPanel'
import { LocalStorageKeys } from '@/constants/localStorage'
import { Plus } from 'lucide-react'
import { ResizableSidebar, SidebarSection, SidebarTextarea } from '@/components/ResizableSidebar'

export const AssetExporterSidebar: React.FC = () => {
  const defaultMasterPrompt =
    'Isometric painted world in the style of Disco Elysium, detailed urban environment, painterly art style'

  const [masterPrompt, setMasterPrompt] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem(LocalStorageKeys.MASTER_PROMPT) || defaultMasterPrompt
    }
    return defaultMasterPrompt
  })

  const currentProject = useWorldStore(state => state.currentProject)

  // Save master prompt to localStorage when it changes
  const handleMasterPromptChange = (value: string) => {
    setMasterPrompt(value)
    if (typeof window !== 'undefined') {
      localStorage.setItem(LocalStorageKeys.MASTER_PROMPT, value)
    }
  }

  return (
    <ResizableSidebar
      title="Asset Exporter"
      storageKey="asset-exporter"
      defaultWidth={320}
      minWidth={280}
      maxWidth={450}
    >
      {/* Master Prompt Section */}
      <SidebarSection variant="plain" className="mb-4 pb-4 border-b border-border">
        <SidebarTextarea
          label="Master Prompt (Style)"
          value={masterPrompt}
          onChange={handleMasterPromptChange}
          placeholder="Define the overall art style and aesthetic..."
          helperText="This style will be applied to generated assets"
        />
      </SidebarSection>

      {/* Main Content */}
      {!currentProject ? (
        <div className="text-center text-muted-foreground mt-10 flex flex-col items-center gap-3">
          <div className="w-12 h-12 rounded-full bg-muted/30 flex items-center justify-center">
            <Plus size={24} className="opacity-50" />
          </div>
          <p>Please select or create a project to start.</p>
        </div>
      ) : (
        <SidebarSection>
          <AssetsPanel />
        </SidebarSection>
      )}
    </ResizableSidebar>
  )
}
