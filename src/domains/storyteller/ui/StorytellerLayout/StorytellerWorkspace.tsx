'use client'

import type { StorytellerPageSlices } from '@/domains/storyteller/state/hooks/useStorytellerPage'
import { useFixInconsistenciesRun } from '@/domains/storyteller/state/hooks/useFixInconsistenciesRun'
import { FixInconsistenciesDialog } from '@/domains/storyteller/ui/FixInconsistencies'
import { StorytellerLeftSidebar } from './panels/StorytellerLeftSidebar'
import { StorytellerCenterPanel } from './panels/StorytellerCenterPanel'
import { StorytellerWritersRoom } from './panels/StorytellerWritersRoom'
import { StorytellerPageModals } from './panels/StorytellerPageModals'

export function StorytellerWorkspace(slices: StorytellerPageSlices) {
  const projectId = slices.core.currentProject?.id ?? null
  const hasPendingBible = Object.keys(slices.core.sectionPendingActions).length > 0
  const fix = useFixInconsistenciesRun({ projectId, hasPendingBible })

  return (
    <div className="flex flex-col h-full bg-background text-foreground overflow-hidden font-sans">
      <div className="flex flex-1 overflow-hidden">
        <StorytellerLeftSidebar {...slices} onFixInconsistencies={fix.start} />
        <StorytellerCenterPanel {...slices} />
        <StorytellerWritersRoom {...slices} />
      </div>
      <StorytellerPageModals {...slices} />
      <FixInconsistenciesDialog
        run={fix.run}
        onApplyAll={fix.applyAll}
        onDiscard={fix.discardAll}
        onCancelScan={fix.cancelScan}
        onClose={fix.clear}
      />
    </div>
  )
}
