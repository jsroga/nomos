import React from 'react'
import { Loader2 } from 'lucide-react'
import { RichText } from '../../RichText'
import type { PendingAction } from './BibleContext'
import { SectionPendingOverlay } from './SectionPendingOverlay'

interface WorldDescriptionLoadingProps {
  isWorldDescLoading: boolean
  pendingAction?: PendingAction
}

export const WorldDescriptionLoading: React.FC<WorldDescriptionLoadingProps> = ({
  isWorldDescLoading,
  pendingAction,
}) => (
  <>
    {pendingAction ? (
      <SectionPendingOverlay pendingAction={pendingAction} onReview={pendingAction.onReview} />
    ) : null}
    {isWorldDescLoading && !pendingAction ? (
      <div className="absolute inset-0 z-10 bg-background/60 backdrop-blur-sm rounded-lg flex items-center justify-center">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="w-4 h-4 animate-spin text-indigo-400" />
          <span>Painting your world...</span>
        </div>
      </div>
    ) : null}
  </>
)

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
      <div className="p-8 bg-muted/5 border border-border/20 rounded-2xl">
        <div className="max-w-4xl mx-auto text-foreground/80 text-[15px] leading-relaxed font-sans">
          <RichText
            text={worldDescription}
            projectId={projectId}
            showPlaceholder
            placeholder="No world description available."
          />
        </div>
      </div>
    )}
  </div>
)
