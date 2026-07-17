'use client'

import React from 'react'
import { ChatInterface } from '@/shared/chat'
import { isAdminUser } from '@/shared/auth/admin-users'
import { DomainSidebar } from '@/components/DomainSidebar'
import { LOOP_AGENT_CONFIG } from '../constants/loop-agent-config'
import { LoopChatInterfaceExtras } from './LoopChatInterfaceExtras'
import { LoopChatSidebarActivityBar } from './LoopChatSidebarActivityBar'
import type { LoopChatSidebarProps } from './loop-chat-sidebar-types'

export type { LoopChatSidebarProps } from './loop-chat-sidebar-types'

export function LoopChatSidebar(props: LoopChatSidebarProps) {
  const {
    projectId,
    currentLoopId,
    userEmail,
    isActivityPanelOpen,
    onActivityToggle,
    messages,
    onSendMessage,
    isSending,
    onStopStream,
    thinkingAgent,
    streamingTokens,
    isTokenStreaming,
    activeAgents,
    streamingSections,
    mentionProviders,
    projectContext,
    onCreateLoopFromEmptyState,
    chatTourId,
    quickActionsTourId,
  } = props

  const showQuickActions = !isSending && !isTokenStreaming && Boolean(currentLoopId)

  return (
    <DomainSidebar
      header={null}
      storageKey="loop-creator-chat"
      defaultWidth={420}
      position="right"
      rawContent
      className="bg-card/30"
    >
      <div className="flex flex-col h-full" id={chatTourId}>
        <LoopChatSidebarActivityBar
          isActivityPanelOpen={isActivityPanelOpen}
          activeAgents={activeAgents}
          streamingSections={streamingSections}
        />

        <div className="flex-1 overflow-hidden">
          <ChatInterface
            messages={messages}
            onSendMessage={onSendMessage}
            isSending={isSending}
            agentConfig={LOOP_AGENT_CONFIG}
            onStopStream={onStopStream}
            isActivityPanelOpen={isActivityPanelOpen}
            onActivityToggle={onActivityToggle}
            isAdmin={isAdminUser(userEmail)}
            thinkingAgent={thinkingAgent}
            streamingTokens={streamingTokens ?? undefined}
            projectId={projectId}
            showThinking={!!thinkingAgent}
            currentPhase="loop_design"
            mentionProviders={mentionProviders}
            projectContext={projectContext}
          >
            <LoopChatInterfaceExtras
              projectId={projectId}
              currentLoopId={currentLoopId}
              isSending={isSending}
              isActivityPanelOpen={isActivityPanelOpen}
              isTokenStreaming={isTokenStreaming}
              streamingTokens={streamingTokens}
              thinkingAgent={thinkingAgent}
              streamingSections={streamingSections}
              onSendMessage={onSendMessage}
              onCreateLoopFromEmptyState={onCreateLoopFromEmptyState}
              quickActionsTourId={quickActionsTourId}
              showQuickActions={showQuickActions}
            />
          </ChatInterface>
        </div>
      </div>
    </DomainSidebar>
  )
}
