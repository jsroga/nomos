'use client'

import React from 'react'
import { ActiveAgentsPanel, SectionProgress } from '@/shared/chat'
import { LOOP_AGENT_CONFIG } from '../constants/loop-agent-config'
import type { LoopChatSidebarProps } from './loop-chat-sidebar-types'

type LoopChatSidebarActivityBarProps = Pick<
  LoopChatSidebarProps,
  'isActivityPanelOpen' | 'activeAgents' | 'streamingSections'
>

export function LoopChatSidebarActivityBar({
  isActivityPanelOpen,
  activeAgents,
  streamingSections,
}: LoopChatSidebarActivityBarProps) {
  if (!isActivityPanelOpen) return null

  return (
    <>
      {activeAgents.length > 0 && (
        <div className="px-4 py-2 border-b bg-card/30">
          <ActiveAgentsPanel activeAgents={activeAgents} agentConfig={LOOP_AGENT_CONFIG} />
        </div>
      )}

      {streamingSections.length > 0 && (
        <div className="px-4 py-2 border-b">
          <SectionProgress
            sections={streamingSections}
            title="Progress"
            collapsible
            defaultExpanded={false}
          />
        </div>
      )}
    </>
  )
}
