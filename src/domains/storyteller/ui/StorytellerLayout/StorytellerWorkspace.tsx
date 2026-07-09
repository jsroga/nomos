'use client'

import type { StorytellerPageState } from '@/domains/storyteller/state/hooks/useStorytellerPage'
import { StorytellerLeftSidebar } from './panels/StorytellerLeftSidebar'
import { StorytellerCenterPanel } from './panels/StorytellerCenterPanel'
import { StorytellerWritersRoom } from './panels/StorytellerWritersRoom'
import { StorytellerPageModals } from './panels/StorytellerPageModals'

export function StorytellerWorkspace(props: StorytellerPageState) {
  return (
    <div className="flex flex-col h-full bg-background text-foreground overflow-hidden font-sans">
      <div className="flex flex-1 overflow-hidden">
        <StorytellerLeftSidebar {...props} />
        <StorytellerCenterPanel {...props} />
        <StorytellerWritersRoom {...props} />
      </div>
      <StorytellerPageModals {...props} />
    </div>
  )
}
