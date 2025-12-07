'use client'

import React, { useState, useEffect } from 'react'
import { useWorldStore } from '@/domains/world-building-toolkit/store/useWorldStore'
import { AssetsPanel } from '@/domains/world-building-toolkit/components/AssetsPanel'
import { SettingsDialog } from '@/domains/world-building-toolkit/components/SettingsDialog'
import { Settings, Plus } from 'lucide-react'
import { LocalStorageKeys } from '@/constants/localStorage'

export const AssetExporterSidebar: React.FC = () => {
  const defaultMasterPrompt =
    'Isometric painted world in the style of Disco Elysium, detailed urban environment, painterly art style'

  const [masterPrompt, setMasterPrompt] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem(LocalStorageKeys.MASTER_PROMPT) || defaultMasterPrompt
    }
    return defaultMasterPrompt
  })

  const [isSettingsOpen, setIsSettingsOpen] = useState(false)
  const currentProject = useWorldStore(state => state.currentProject)

  // Save master prompt to localStorage when it changes
  const handleMasterPromptChange = (value: string) => {
    setMasterPrompt(value)
    if (typeof window !== 'undefined') {
      localStorage.setItem(LocalStorageKeys.MASTER_PROMPT, value)
    }
  }

  return (
    <div className="w-80 h-full bg-card border-r border-border flex flex-col">
      <div className="p-4 border-b border-border flex items-center justify-between">
        <h1 className="font-bold text-xl">Asset Exporter</h1>
        <button
          onClick={() => setIsSettingsOpen(true)}
          className="p-2 hover:bg-accent rounded-full transition-colors"
          title="Settings"
        >
          <Settings size={20} />
        </button>
      </div>

      {/* Master Prompt - Always Visible */}
      <div className="p-4 border-b border-border">
        <label className="block text-sm font-medium mb-2">Master Prompt (Style)</label>
        <textarea
          className="w-full h-24 bg-background border border-input rounded-md p-3 text-sm resize-none focus:ring-2 focus:ring-primary focus:outline-none"
          value={masterPrompt}
          onChange={e => handleMasterPromptChange(e.target.value)}
          placeholder="Define the overall art style and aesthetic..."
        />
        <p className="text-xs text-muted-foreground mt-1">
          This style will be applied to generated assets
        </p>
      </div>

      <div className="p-4 flex-1 overflow-y-auto">
        {!currentProject ? (
          <div className="text-center text-muted-foreground mt-10 flex flex-col items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-muted/30 flex items-center justify-center">
              <Plus size={24} className="opacity-50" />
            </div>
            <p>Please select or create a project to start.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Reuse AssetsPanel but always show it */}
            <AssetsPanel />
          </div>
        )}
      </div>

      <SettingsDialog isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} />
    </div>
  )
}
