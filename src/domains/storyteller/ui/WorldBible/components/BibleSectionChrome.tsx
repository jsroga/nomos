import type { FC, ReactNode } from 'react'
import { Loader2, Plus, RefreshCw } from 'lucide-react'
import type { PendingAction } from '../utils/bible-context-types'
import { BibleSectionChromeClass } from '../constants/bible-section-ui'
import { SectionPendingOverlay } from './SectionPendingOverlay'

const actionButtonClass =
  'p-1.5 rounded-lg transition-all duration-200 text-muted-foreground hover:text-indigo-400 hover:bg-indigo-500/10 hover:scale-105'

function disabledWhenLoading(isLoading: boolean): string {
  return isLoading ? BibleSectionChromeClass.DisabledWhenLoading : ''
}

export const BibleSectionLoadingOverlay: FC<{ message: string; spinnerClassName?: string }> = ({
  message,
  spinnerClassName = BibleSectionChromeClass.DefaultSpinner,
}) => (
  <div className="absolute inset-0 z-10 bg-background/60 backdrop-blur-sm rounded-lg flex items-center justify-center">
    <div className="flex items-center gap-2 text-sm text-muted-foreground">
      <Loader2 className={`w-4 h-4 animate-spin ${spinnerClassName}`} />
      <span>{message}</span>
    </div>
  </div>
)

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
}) => (
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
          className={`${actionButtonClass} ${disabledWhenLoading(isLoading)}`}
          title={generateTitle}
          disabled={isLoading}
          type="button"
        >
          <RefreshCw size={14} className={isLoading ? 'animate-spin' : ''} />
        </button>
      )}
    </div>
  </div>
)

export const BibleSectionShell: FC<{
  isLoading: boolean
  loadingMessage: string
  spinnerClassName?: string
  pendingAction?: PendingAction
  children: ReactNode
}> = ({ isLoading, loadingMessage, spinnerClassName, pendingAction, children }) => (
  <section className={isLoading || pendingAction ? 'relative' : ''}>
    {pendingAction && (
      <SectionPendingOverlay pendingAction={pendingAction} onReview={pendingAction.onReview} />
    )}
    {isLoading && !pendingAction && (
      <BibleSectionLoadingOverlay message={loadingMessage} spinnerClassName={spinnerClassName} />
    )}
    {children}
  </section>
)
