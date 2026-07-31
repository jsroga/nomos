'use client'

import { AssistantChat } from '@/shared/chat/assistant/AssistantChat'
import { DomainSidebar } from '@/components/DomainSidebar'
import type { LoopChatSidebarProps } from './loop-chat-sidebar-types'

export type { LoopChatSidebarProps } from './loop-chat-sidebar-types'

/**
 * Loop-creator chat — now on assistant-ui (roadmap B4/C1). Talks to the
 * registered `loopCreatorSupervisor` Mastra agent via /api/assistant.
 *
 * NOTE: this streams the supervisor agent, not the full LangGraph-style crew
 * orchestration (`/api/loop-creator/chat` → streamLoopCreator). Wiring the crew
 * + the activity bar / quick actions as assistant-ui tool UIs is the follow-up
 * (Track B2). The old streaming props remain on the interface for callers but
 * are no longer consumed here.
 */
export function LoopChatSidebar({
  chatTourId,
  projectId,
  mentionProviders,
  projectContext,
}: LoopChatSidebarProps) {
  return (
    <DomainSidebar
      header={null}
      storageKey="loop-creator-chat"
      defaultWidth={420}
      position="right"
      rawContent
      className="bg-card/30"
    >
      <div className="flex h-full flex-col" id={chatTourId}>
        <div className="flex-1 overflow-hidden">
          <AssistantChat
            key={projectId || 'pending'}
            moduleKey="loop-creator"
            body={{ projectId }}
            mentionProviders={mentionProviders}
            mentionProjectContext={projectContext}
            persistKey={projectId ? `loop-creator-${projectId}` : undefined}
          />
        </div>
      </div>
    </DomainSidebar>
  )
}
