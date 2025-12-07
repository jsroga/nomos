'use client'

import React, { useState } from 'react'
import { useWorldStore } from '@/domains/world-building-toolkit/store/useWorldStore'
import { AssetsPanel } from '@/domains/world-building-toolkit/components/AssetsPanel'
import { DomainSidebar } from '@/components/ui/domain-sidebar'
import { SettingsBox } from '@/components/ui/settings-box'
import { Plus } from 'lucide-react'
import { LocalStorageKeys } from '@/constants/localStorage'
import { Textarea } from '@/components/ui/textarea'

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
    <DomainSidebar title="Asset Exporter">
      {!currentProject ? (
        <div className="text-center text-muted-foreground mt-10 flex flex-col items-center gap-3">
          <div className="w-12 h-12 rounded-full bg-muted/30 flex items-center justify-center">
            <Plus size={24} className="opacity-50" />
          </div>
          <p>Please select or create a project to start.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Master Prompt */}
          <SettingsBox title="Master Prompt (Style)">
            <Textarea
              value={masterPrompt}
              onChange={e => handleMasterPromptChange(e.target.value)}
              placeholder="Define the overall art style and aesthetic..."
              className="h-24 text-sm resize-none"
            />
            <p className="text-xs text-muted-foreground">
              This style will be applied to generated assets
            </p>
          </SettingsBox>

          {/* Assets Panel */}
          <AssetsPanel />
        </div>
      )}
    </DomainSidebar>
  )
}
