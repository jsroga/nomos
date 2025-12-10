'use client'

import React, { useState } from 'react'
import { useWorldStore } from '@/domains/world-building-toolkit/store/useWorldStore'
import { Settings } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { SettingsDialog } from '@/domains/world-building-toolkit/components/SettingsDialog'
import { ProjectSelectorDropdown } from '@/components/ProjectSelectorDropdown'
import { AsyncStatusIndicator } from '@/components/AsyncStatusIndicator'
import { TroubleshootIndicator } from '@/components/TroubleshootIndicator'

export function GlobalHeader() {
  const currentProject = useWorldStore(state => state.currentProject)
  const [isSettingsOpen, setIsSettingsOpen] = useState(false)

  return (
    <>
      <div className="h-14 bg-card border-b border-border flex items-center px-4 gap-4 shrink-0">
        <div className="text-lg font-bold flex items-center gap-2">
          <span className="hidden sm:inline">World Building Kit</span>
        </div>

        <ProjectSelectorDropdown />

        <div className="ml-auto flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setIsSettingsOpen(true)}
            title="Settings"
          >
            <Settings size={18} />
          </Button>
          <AsyncStatusIndicator />
          <TroubleshootIndicator />
        </div>
      </div>

      <SettingsDialog
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        projectId={currentProject?.id}
      />
    </>
  )
}
