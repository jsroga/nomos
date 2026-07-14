import React from 'react'
import { Minus, Plus } from 'lucide-react'
import ReactDiffViewer, { DiffMethod } from 'react-diff-viewer-continued'
import type { ActionChange } from '@/domains/storyteller/ui/ActionApprovalModal/action-approval-types'
import { DIFF_VIEWER_STYLES } from '@/domains/storyteller/ui/ActionApprovalModal/constants/action-approval-display'
import {
  ChangeTypeBadge,
  formatJSON,
  ReasonLine,
} from '@/domains/storyteller/ui/ActionApprovalModal/action-approval-helpers'

interface ApprovalModalDiffPanelProps {
  currentChange?: ActionChange
}

export const ApprovalModalDiffPanel: React.FC<ApprovalModalDiffPanelProps> = ({ currentChange }) => (
  <div className="h-full overflow-hidden flex flex-col">
    {currentChange && (
      <div className="px-6 py-2 bg-muted/20 border-b border-border/30 shrink-0">
        <div className="flex items-center gap-2">
          <span className="text-xs font-mono text-primary">{currentChange.path}</span>
          <ChangeTypeBadge type={currentChange.changeType} />
        </div>
        <ReasonLine reason={currentChange.reason} />
      </div>
    )}

    <div className="flex-1 overflow-auto">
      {currentChange ? (
        <div className="h-full">
          <div className="grid grid-cols-2 border-b border-border/50 sticky top-0 bg-background z-10">
            <div className="px-4 py-2 text-xs font-medium text-red-400 bg-red-500/5 border-r border-border/50 flex items-center gap-2">
              <Minus className="w-3 h-3" />
              BEFORE
            </div>
            <div className="px-4 py-2 text-xs font-medium text-green-400 bg-green-500/5 flex items-center gap-2">
              <Plus className="w-3 h-3" />
              AFTER
            </div>
          </div>
          <ReactDiffViewer
            oldValue={formatJSON(currentChange.before)}
            newValue={formatJSON(currentChange.after)}
            splitView={true}
            compareMethod={DiffMethod.WORDS}
            hideLineNumbers={false}
            showDiffOnly={false}
            styles={DIFF_VIEWER_STYLES}
            useDarkTheme={true}
          />
        </div>
      ) : (
        <div className="flex items-center justify-center h-full text-muted-foreground">
          No changes to display
        </div>
      )}
    </div>
  </div>
)
