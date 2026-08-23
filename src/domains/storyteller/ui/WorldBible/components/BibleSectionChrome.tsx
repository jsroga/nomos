import type { FC, ReactNode } from 'react'
import { Loader2, Plus, RefreshCw } from 'lucide-react'
import type { PendingAction } from '../utils/bible-context-types'
import { BibleSectionChromeClass } from '../constants/bible-section-ui'
import { pendingReviewHostClass } from '../constants/section-pending-overlay'
import { SectionPendingOverlay } from './SectionPendingOverlay'
import { useStorytellerUiStore } from '@/domains/storyteller/state/useStorytellerUiStore'
import {
  GenerationActivityPhase,
} from '@/domains/storyteller/state/constants/storyteller-ui-store'
import { StorytellerAgentId } from '@/domains/storyteller/ai/constants/agent-identity'
import { BibleMarkdown } from '@/domains/storyteller/ui/RichText/BibleMarkdown'
import { cn } from '@/shared/data/utils'

const actionButtonClass =
  'p-1.5 rounded-lg transition-all duration-200 text-muted-foreground hover:text-indigo-400 hover:bg-indigo-500/10 hover:scale-105'

function disabledWhenLoading(isLoading: boolean): string {
  return isLoading ? BibleSectionChromeClass.DisabledWhenLoading : ''
}

export function ToolActivityMarkdownPreview({
  preview,
  className,
}: {
  preview?: string
  className?: string
}) {
  if (!preview) return null
  return (
    <div
      className={cn(
        'w-full overflow-y-auto rounded-md border border-border/40 bg-background/80 p-2 text-xs text-foreground/80',
        className
      )}
    >
      <BibleMarkdown text={preview} />
    </div>
  )
}

export const BibleSectionLoadingOverlay: FC<{ message: string; spinnerClassName?: string }> = ({
  message,
  spinnerClassName = BibleSectionChromeClass.DefaultSpinner,
}) => {
  const phase = useStorytellerUiStore(state => state.generationActivity.phase)
  const label = useStorytellerUiStore(state => state.generationActivity.label)
  const toolName = useStorytellerUiStore(state => state.generationActivity.toolName)
  const toolComplete = useStorytellerUiStore(state => state.generationActivity.toolComplete)
  const agentId = useStorytellerUiStore(state => state.generationActivity.agentId)
  const preview = useStorytellerUiStore(state => state.generationActivity.preview)
  const liveLabel =
    phase !== GenerationActivityPhase.Idle && label ? label : message
  const showSpinner = !toolComplete

  return (
    <div className="absolute inset-0 z-10 bg-background/70 backdrop-blur-sm rounded-lg flex flex-col items-center justify-center gap-2 p-4">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        {showSpinner ? (
          <Loader2 className={`w-4 h-4 animate-spin ${spinnerClassName}`} />
        ) : null}
        <span>{liveLabel}</span>
      </div>
      {toolName ? (
        <div className="text-[11px] font-mono text-muted-foreground/80">
          agent: {agentId ?? StorytellerAgentId.Storyteller} · {toolName}
        </div>
      ) : null}
      <ToolActivityMarkdownPreview preview={preview} className="max-h-32 max-w-lg" />
    </div>
  )
}

export const BibleSectionHeader: FC<{
  icon: ReactNode
  title: string
  isEditing?: boolean
  isReadOnly?: boolean
  isLoading?: boolean
  onAdd?: () => void
  addTitle?: string
  onGenerate?: () => void
  generateTitle?: string
  trailingActions?: ReactNode
}> = ({
  icon,
  title,
  isEditing = false,
  isReadOnly = false,
  isLoading = false,
  onAdd,
  addTitle,
  onGenerate,
  generateTitle,
  trailingActions,
}) => {
  const generateDisabled = isLoading

  return (
    <div className="flex items-center justify-between mb-4">
      <div className="flex items-center gap-2">
        {icon}
        <h3 className="font-syne font-bold text-lg">{title}</h3>
      </div>
      <div className="flex gap-2">
        {trailingActions}
        {isEditing && onAdd && (
          <button
            onClick={onAdd}
            className={`${actionButtonClass} ${disabledWhenLoading(isLoading)}`}
            title={addTitle}
            disabled={isLoading}
            type="button"
          >
            <Plus size={14} />
          </button>
        )}
        {!isReadOnly && onGenerate && (
          <button
            onClick={onGenerate}
            className={`${actionButtonClass} ${disabledWhenLoading(generateDisabled)}`}
            title={generateTitle}
            disabled={generateDisabled}
            type="button"
          >
            <RefreshCw size={14} className={isLoading ? 'animate-spin' : ''} />
          </button>
        )}
      </div>
    </div>
  )
}

export const BibleSectionShell: FC<{
  isLoading: boolean
  loadingMessage: string
  spinnerClassName?: string
  pendingAction?: PendingAction
  children: ReactNode
}> = ({ isLoading, loadingMessage, spinnerClassName, pendingAction, children }) => (
  <section className={pendingReviewHostClass(Boolean(pendingAction), isLoading)}>
    {pendingAction && (
      <SectionPendingOverlay pendingAction={pendingAction} onReview={pendingAction.onReview} />
    )}
    {isLoading && !pendingAction && (
      <BibleSectionLoadingOverlay message={loadingMessage} spinnerClassName={spinnerClassName} />
    )}
    {children}
  </section>
)
