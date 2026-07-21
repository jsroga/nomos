'use client'

import { TOUR_STEP_IDS } from '@/shared/tours/tour-constants'
import { DomainSidebar } from '@/components/DomainSidebar'
import { AssistantChat } from '@/shared/chat/assistant/AssistantChat'
import type { StorytellerPageSlices } from '@/domains/storyteller/state/hooks/useStorytellerPage'

/**
 * Writers Room chat — now on assistant-ui (roadmap B4). Streams the registered
 * `storyteller` chat-adapter Mastra agent (faithful single agent with the same
 * 10 tools) via /api/assistant/storyteller.
 *
 * PENDING re-home (see ASSISTANT-UI-SWAP-TRACKER.md): mentions, HITL agent
 * questions, action approvals + optimistic board sync, model picker, quick
 * actions, streaming sections. The agent's tools still execute server-side (so
 * beats/characters persist), but the client-side approval/optimistic flow is not
 * yet wired. `props` (old chat/agent slices) are intentionally unused here.
 */
export function StorytellerWritersRoom(_props: StorytellerPageSlices) {
  return (
    <DomainSidebar header={null} position="right" storageKey="writers-room" defaultWidth={384} rawContent>
      <div className="flex h-full flex-col" id={TOUR_STEP_IDS.STORYTELLER_CHAT}>
        <AssistantChat agentId="storyteller" />
      </div>
    </DomainSidebar>
  )
}
