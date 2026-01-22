'use client'

import React, { useState } from 'react'
import { useWorldStore } from '@/domains/world-building-toolkit/store/useWorldStore'
import { Settings } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { SettingsDialog } from '@/domains/world-building-toolkit/components/SettingsDialog'
import { ProjectSelectorDropdown } from '@/components/ProjectSelectorDropdown'
import { AsyncStatusIndicator } from '@/components/AsyncStatusIndicator'
import { TroubleshootIndicator } from '@/components/TroubleshootIndicator'
import { LiquidBackgroundProvider } from '@/domains/marketing/components/LiquidBackgroundProvider'

export function GlobalHeader() {
  const currentProject = useWorldStore(state => state.currentProject)
  const [isSettingsOpen, setIsSettingsOpen] = useState(false)

  return (
    <LiquidBackgroundProvider showCanvas={false}>
      <div className="h-14 bg-card border-b border-border flex items-center px-4 gap-4 shrink-0 relative z-[100]">
        <div className="flex items-center gap-2">
          {/* <img src="/logo.svg" alt="Logo" className="h-6 w-auto brightness-0 invert opacity-50" /> */}
          <span
            className="text-xl font-black tracking-tight bg-gradient-to-r from-white to-white/60 bg-clip-text text-transparent hover:to-primary/80 transition-all cursor-default"
            style={{ fontFamily: 'var(--font-syne)' }}
          >
            KUR
          </span>
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
    </LiquidBackgroundProvider>
  )
}
