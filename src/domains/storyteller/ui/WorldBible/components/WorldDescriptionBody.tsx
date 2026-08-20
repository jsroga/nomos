'use client'

import React from 'react'
import { Loader2 } from 'lucide-react'
import { RichText } from '../../RichText'
import type { PendingAction } from './BibleContext'
import { SectionPendingOverlay } from './SectionPendingOverlay'
import { ToolActivityMarkdownPreview } from './BibleSectionChrome'
import { useStorytellerUiStore } from '@/domains/storyteller/state/useStorytellerUiStore'
import { GenerationActivityPhase } from '@/domains/storyteller/state/constants/storyteller-ui-store'
import { StorytellerAgentId } from '@/domains/storyteller/ai/constants/agent-identity'

interface WorldDescriptionLoadingProps {
  isWorldDescLoading: boolean
  pendingAction?: PendingAction
}

export const WorldDescriptionLoading: React.FC<WorldDescriptionLoadingProps> = ({
  isWorldDescLoading,
  pendingAction,
}) => {
  const activity = useStorytellerUiStore(state => state.generationActivity)
  const showActivity =
    isWorldDescLoading &&
    !pendingAction &&
    activity.phase !== GenerationActivityPhase.Idle
  const showSpinner = showActivity && !activity.toolComplete

  return (
    <>
      {pendingAction ? (
        <SectionPendingOverlay pendingAction={pendingAction} onReview={pendingAction.onReview} />
      ) : null}
      {isWorldDescLoading && !pendingAction ? (
        <div className="absolute inset-0 z-10 bg-background/70 backdrop-blur-sm rounded-lg flex flex-col items-center justify-center gap-3 p-4">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            {showSpinner ? (
              <Loader2 className="w-4 h-4 animate-spin text-indigo-400 shrink-0" />
            ) : null}
            <span>
              {showActivity && activity.label ? activity.label : 'Painting your world…'}
            </span>
          </div>
          {showActivity && activity.toolName ? (
            <div className="text-[11px] font-mono text-indigo-300/80">
              agent: {activity.agentId ?? StorytellerAgentId.Storyteller} · {activity.toolName}
            </div>
          ) : null}
          <ToolActivityMarkdownPreview
            preview={showActivity ? activity.preview : undefined}
            className="max-h-40 max-w-xl p-3 leading-relaxed"
          />
          {activity.phase === GenerationActivityPhase.Error && activity.error ? (
            <p className="text-xs text-red-400 max-w-md text-center">{activity.error}</p>
          ) : null}
        </div>
      ) : null}
    </>
  )
}

interface WorldDescriptionBodyProps {
  isEditing: boolean
  worldDescription: string | undefined
  projectId: string
  onWorldDescriptionChange: (value: string) => void
}

export const WorldDescriptionBody: React.FC<WorldDescriptionBodyProps> = ({
  isEditing,
  worldDescription,
  projectId,
  onWorldDescriptionChange,
}) => (
  <div className="w-full mt-8">
    {isEditing ? (
      <textarea
        className="w-full h-64 p-6 bg-background border border-border rounded-xl text-sm font-sans focus:ring-1 focus:ring-primary/30 outline-none resize-none shadow-sm"
        value={worldDescription || ''}
        onChange={e => onWorldDescriptionChange(e.target.value)}
        placeholder="Describe the world..."
      />
    ) : (
      <div className="bg-transparent border border-border/20 rounded-2xl">
        <div className="max-w-4xl mx-auto text-foreground/80 text-[15px] leading-relaxed font-sans">
          <RichText
            text={worldDescription}
            projectId={projectId}
            markdown
            showPlaceholder
            placeholder="No world description available."
          />
        </div>
      </div>
    )}
  </div>
)
