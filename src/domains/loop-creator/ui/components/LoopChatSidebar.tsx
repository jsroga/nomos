'use client'

import React from 'react'
import { Layers, Plus } from 'lucide-react'
import {
  ActiveAgentsPanel,
  ChatInterface,
  SectionProgress,
  SmartQuickActions,
  StreamingSectionsInline,
  StreamingTerminal,
} from '@/shared/chat'
import { isAdminUser } from '@/shared/auth/admin-users'
import { Button } from '@/components/Button'
import { Badge } from '@/components/Badge'
import { EntitySelectorButton } from '@/components/EntityPicker'
import { DomainSidebar } from '@/components/DomainSidebar'
import { LOOP_AGENT_CONFIG } from '../constants/loop-agent-config'

interface LoopChatSidebarProps {
  projectId: string
  currentLoopId: string | null
  userEmail: string | null
  isActivityPanelOpen: boolean
  onActivityToggle: () => void
  messages: Parameters<typeof ChatInterface>[0]['messages']
  onSendMessage: (message: string) => void
  isSending: boolean
  onStopStream: () => void
  thinkingAgent: string | null | undefined
  streamingTokens: string | null | undefined
  isTokenStreaming: boolean
  activeAgents: Parameters<typeof ActiveAgentsPanel>[0]['activeAgents']
  streamingSections: Parameters<typeof SectionProgress>[0]['sections']
  mentionProviders: Parameters<typeof ChatInterface>[0]['mentionProviders']
  projectContext: Parameters<typeof ChatInterface>[0]['projectContext']
  onCreateLoopFromEmptyState: () => void
  chatTourId: string
  quickActionsTourId: string
}

export function LoopChatSidebar({
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
}: LoopChatSidebarProps) {
  const showQuickActions = !isSending && !isTokenStreaming && currentLoopId

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
        {isActivityPanelOpen && activeAgents.length > 0 && (
          <div className="px-4 py-2 border-b bg-card/30">
            <ActiveAgentsPanel activeAgents={activeAgents} agentConfig={LOOP_AGENT_CONFIG} />
          </div>
        )}

        {isActivityPanelOpen && streamingSections.length > 0 && (
          <div className="px-4 py-2 border-b">
            <SectionProgress
              sections={streamingSections}
              title="Progress"
              collapsible
              defaultExpanded={false}
            />
          </div>
        )}

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
              <div className="mt-4 border-t border-border/10 pt-4 px-4 pb-2">
                <div className="flex items-center gap-2 mb-2 px-1">
                  <Layers className="w-3 h-3 text-purple-400" />
                  <span className="text-[10px] text-muted-foreground/80 font-medium uppercase tracking-widest">
                    Cross-Domain Entities
                  </span>
                  <Badge
                    variant="outline"
                    className="text-[9px] px-1.5 py-0 bg-purple-500/10 text-purple-400 border-purple-500/30"
                  >
                    NEW
                  </Badge>
                </div>
                <div className="px-1 mb-3">
                  <p className="text-[11px] text-muted-foreground/60 leading-relaxed">
                    Reference characters, locations, and other entities from Storyteller and other
                    domains
                  </p>
                </div>
                <div className="flex flex-wrap gap-2 px-1">
                  <EntitySelectorButton
                    projectId={projectId}
                    onSelectEntity={entity => {
                      onSendMessage(
                        `Design mechanics for @${entity.name} (${entity.entityType} from ${entity.sourceDomain})`,
                      )
                    }}
                    filterType="character"
                    label="Add Character"
                  />
                  <EntitySelectorButton
                    projectId={projectId}
                    onSelectEntity={entity => {
                      onSendMessage(`Create gameplay for @${entity.name} (${entity.entityType})`)
                    }}
                    filterType="location"
                    label="Add Location"
                  />
                  <EntitySelectorButton
                    projectId={projectId}
                    onSelectEntity={entity => {
                      onSendMessage(`Reference @${entity.name} in this loop design`)
                    }}
                    label="Browse All"
                  />
                </div>
              </div>
            )}

            <div
              id={quickActionsTourId}
              className="mt-4 border-t border-border/10 pt-4 px-4 pb-2"
            >
              {showQuickActions ? (
                <>
                  <div className="flex items-center gap-2 mb-1.5 px-1">
                    <span className="text-[10px] text-muted-foreground/60 font-medium uppercase tracking-widest">
                      Suggested
                    </span>
                  </div>
                  <SmartQuickActions
                    currentPhase="loop_design"
                    onSendMessage={onSendMessage}
                    proposeLabel="Analyze loops"
                    proposePrompt="Analyze the current game loops and suggest improvements or next steps."
                  />
                </>
              ) : (
                <div className="text-center py-2">
                  <p className="text-xs text-muted-foreground">
                    Quick actions appear when a loop is selected
                  </p>
                </div>
              )}
            </div>

            {!currentLoopId && !isSending && (
              <div className="mt-4 px-4 pb-4">
                <div className="text-center p-4 rounded-lg bg-muted/30 border border-border/50">
                  <p className="text-sm text-muted-foreground mb-2">
                    Create a loop to start chatting with AI
                  </p>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={onCreateLoopFromEmptyState}
                    className="gap-1.5"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    Create Loop
                  </Button>
                </div>
              </div>
            )}
          </ChatInterface>
        </div>
      </div>
    </DomainSidebar>
  )
}
