'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useWorkspaceProjectStore } from '@/shared/workspace/workspace-project-store'
import { Settings } from 'lucide-react'
import { Button } from '@/components/Button'
import { SettingsDialog } from '@/domains/2d-canvas'
import { ProjectSelectorDropdown } from '@/components/shell/ProjectSelectorDropdown'
import { AsyncStatusIndicator } from '@/components/AsyncStatusIndicator'
import { TroubleshootIndicator } from '@/components/shell/TroubleshootIndicator'
import { isWorkspaceChatOverlayEnabled } from '@/shared/data/constants/feature-flags'
import { WorkspaceChatToggle } from '@/shared/chat/ui/WorkspaceChatOverlay/WorkspaceChatToggle'

export function GlobalHeader() {
  const currentProject = useWorkspaceProjectStore(state => state.currentProject)
  const [isSettingsOpen, setIsSettingsOpen] = useState(false)

  return (
    <>
      <div className="relative z-[100] flex h-16 shrink-0 items-center gap-4 border-b border-white/[0.06] bg-[rgba(9,9,11,0.92)] px-6">
        <div className="flex items-center gap-2">
          <Link
            href="/projects"
            className="cursor-pointer font-mono text-sm font-bold uppercase tracking-widest text-white/50 transition-colors hover:text-white"
          >
            / PROJECT /
          </Link>
        </div>

        <ProjectSelectorDropdown />

        <div className="ml-auto flex items-center gap-1">
          {isWorkspaceChatOverlayEnabled() ? <WorkspaceChatToggle /> : null}
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setIsSettingsOpen(true)}
            title="Settings"
            className="text-white/70 hover:bg-white/5 hover:text-white"
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
