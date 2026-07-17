'use client'

import React from 'react'
import { StreamingSectionsInline, StreamingTerminal } from '@/shared/chat'
import { LoopChatCrossDomainEntities } from './LoopChatCrossDomainEntities'
import { LoopChatEmptyState } from './LoopChatEmptyState'
import { LoopChatQuickActionsPanel } from './LoopChatQuickActionsPanel'
import type { LoopChatSidebarProps } from './loop-chat-sidebar-types'

type LoopChatInterfaceExtrasProps = Pick<
  LoopChatSidebarProps,
  | 'projectId'
  | 'currentLoopId'
  | 'isSending'
  | 'isActivityPanelOpen'
  | 'isTokenStreaming'
  | 'streamingTokens'
  | 'thinkingAgent'
  | 'streamingSections'
  | 'onSendMessage'
  | 'onCreateLoopFromEmptyState'
  | 'quickActionsTourId'
> & {
  showQuickActions: boolean
}

export function LoopChatInterfaceExtras({
  projectId,
  currentLoopId,
  isSending,
  isActivityPanelOpen,
  isTokenStreaming,
  streamingTokens,
  thinkingAgent,
  streamingSections,
  onSendMessage,
  onCreateLoopFromEmptyState,
  quickActionsTourId,
  showQuickActions,
}: LoopChatInterfaceExtrasProps) {
  return (
    <>
      {isActivityPanelOpen && isTokenStreaming && streamingTokens && (
        <div className="mb-4 animate-in fade-in duration-300">
          <StreamingTerminal streamingTokens={streamingTokens} thinkingAgent={thinkingAgent} />
        </div>
      )}

      {isActivityPanelOpen && streamingSections.length > 0 && (
        <div className="mb-4 space-y-2">
          <StreamingSectionsInline sections={streamingSections} />
        </div>
      )}

      {showQuickActions && (
        <LoopChatCrossDomainEntities projectId={projectId} onSendMessage={onSendMessage} />
      )}

      <LoopChatQuickActionsPanel
        showQuickActions={showQuickActions}
        quickActionsTourId={quickActionsTourId}
        onSendMessage={onSendMessage}
      />

      {!currentLoopId && !isSending && (
        <LoopChatEmptyState onCreateLoop={onCreateLoopFromEmptyState} />
      )}
    </>
  )
}
