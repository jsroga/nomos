'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import { useWorldStore } from '@/domains/world-building-toolkit'
import { Settings } from 'lucide-react'
import { Button } from '@/components/Button'
import { SettingsDialog } from '@/domains/world-building-toolkit/ui/SettingsDialog'
import { ProjectSelectorDropdown } from '@/components/shell/ProjectSelectorDropdown'
import { AsyncStatusIndicator } from '@/components/AsyncStatusIndicator'
import { TroubleshootIndicator } from '@/components/shell/TroubleshootIndicator'
import { LiquidBackgroundProvider } from '@/domains/marketing'

export function GlobalHeader() {
  const currentProject = useWorldStore(state => state.currentProject)
  const [isSettingsOpen, setIsSettingsOpen] = useState(false)

  return (
    <LiquidBackgroundProvider showCanvas={false}>
      <div className="h-14 bg-card border-b border-border flex items-center px-4 gap-4 shrink-0 relative z-[100]">
        <div className="flex items-center gap-2">
          {/* <img src="/logo.svg" alt="Logo" className="h-6 w-auto brightness-0 invert opacity-50" /> */}
          <Link
            href="/projects"
            className="text-sm font-mono font-bold uppercase tracking-widest text-muted-foreground cursor-pointer hover:text-foreground transition-colors"
          >
            / PROJECT /
          </Link>
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
