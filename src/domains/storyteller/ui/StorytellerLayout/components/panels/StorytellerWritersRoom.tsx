'use client'

import { TOUR_STEP_IDS } from '@/shared/tours/tour-constants'
import { MentionsChatInterface, MentionsProvider, STORYTELLER_AGENT_CONFIG } from '@/domains/storyteller'
import { SmartQuickActions, StreamingTerminal, StreamingSectionsInline, ModelSelector } from '../../utils/writers-room-chat'
import { Users } from 'lucide-react'
import { Button } from '@/components/Button'
import { DomainSidebar } from '@/components/DomainSidebar'
import { isAdminUser } from '@/shared/auth/admin-users'
import { USER_SELECTABLE_CHAT_MODELS } from '@/domains/storyteller/config/constants/chat-model-catalog'
import { recordFromJson } from '@/shared/data/json-guards'
import type { StorytellerPageState } from '@/domains/storyteller/state/hooks/useStorytellerPage'

export function StorytellerWritersRoom(props: StorytellerPageState) {
  const {
    routeProjectId,
    characters,
    beats,
    storyPlan,
    isActivityPanelOpen,
    toggleActivityPanel,
    userEmail,
    messages,
    currentProject,
    thinkingAgent,
    streamingTokens,
    chatActiveOperations,
    handleChatSendMessage,
    handleStopStream,
    handleChatQuestionAnswer,
    handleChatQuestionSkip,
    handleApproveAllActions,
    isSending,
    showThinking,
    currentPhase,
    selectedModel,
    handleModelChange,
    MemoizedActionComponent,
    StableQuestionComponent,
    isTokenStreaming,
    streamingSections,
    handleSendMessage,
  } = props

  return (
    <DomainSidebar
          header={null}
          position="right"
          storageKey="writers-room"
          defaultWidth={384}
          rawContent
        >
          <div className="flex flex-col h-full" id={TOUR_STEP_IDS.STORYTELLER_CHAT}>
            <MentionsProvider
              projectId={routeProjectId ?? ''}
              characters={characters}
              beats={beats}
              storyPlan={storyPlan ? recordFromJson(storyPlan) : null}
            >
            <MentionsChatInterface
              isActivityPanelOpen={isActivityPanelOpen}
              onActivityToggle={toggleActivityPanel}
              isAdmin={isAdminUser(userEmail)}
              messages={messages}
              agentConfig={STORYTELLER_AGENT_CONFIG}
              projectId={currentProject?.id}
              thinkingAgent={thinkingAgent}
              streamingTokens={streamingTokens}
              activeOperations={chatActiveOperations}
              onSendMessage={handleChatSendMessage}
              onStopStream={handleStopStream}
              onQuestionAnswer={handleChatQuestionAnswer}
              onQuestionSkip={handleChatQuestionSkip}
              onApproveAllActions={handleApproveAllActions}
              isSending={isSending}
              showThinking={showThinking}
              currentPhase={currentPhase}
              headerContent={
                <ModelSelector
                  value={selectedModel}
                  onChange={handleModelChange}
                  models={USER_SELECTABLE_CHAT_MODELS}
                />
              }
              ActionComponent={MemoizedActionComponent}
              QuestionComponent={StableQuestionComponent}
            >
              {/* Streaming Terminal - Only when Activity ON */}
              {isActivityPanelOpen && isTokenStreaming && streamingTokens && (
                <div className="mb-4 ml-8 animate-in fade-in duration-300">
                  <StreamingTerminal
                    streamingTokens={streamingTokens}
                    thinkingAgent={
                      thinkingAgent === 'RunnableSequence' ? 'agent' : thinkingAgent
                    }
                    fallbackAgentLabel="writers-room"
                  />
                </div>
              )}

              {/* Streaming Sections Inline - Only when Activity ON */}
              {isActivityPanelOpen && streamingSections.length > 0 && (
                <div className="mb-4 ml-8">
                  <StreamingSectionsInline sections={streamingSections} />
                </div>
              )}

              {/* Smart Quick Actions & Propose Next Step */}
              {!isSending && !isTokenStreaming && (
                <div className="mt-2 border-t border-border/10 pt-2 px-2 pb-1">
                  <div className="flex items-center justify-between mb-1.5 px-1">
                    <span className="text-[10px] text-muted-foreground/60 font-medium uppercase tracking-widest">
                      Suggested
                    </span>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-5 px-2 text-[10px] text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50 transition-colors"
                      onClick={() => handleSendMessage(undefined, 'I\'d like to expand our cast of characters. Considering the setting and story so far, who would be an interesting new character to introduce next?')}
                    >
                      <Users className="w-3 h-3 mr-1" />
                      Add Cast
                    </Button>
                  </div>
                  <SmartQuickActions
                    currentPhase={currentPhase}
                    onSendMessage={msg => {
                      handleSendMessage(undefined, msg)
                    }}
                  />
                </div>
              )}
            </MentionsChatInterface>
            </MentionsProvider>
          </div>
        </DomainSidebar>
  )
}
