import React from 'react'
import { Button } from '@/components/Button'
import { ArrowRight, ChevronDown, ChevronUp, Code, Plus } from 'lucide-react'
import type { ActionChange } from '@/domains/storyteller/ui/ActionApprovalModal/action-approval-types'
import { ApprovalViewMode } from '@/domains/storyteller/ui/ActionApprovalModal/constants/action-approval-display'
import { GenericItemTable } from '@/domains/storyteller/ui/ActionApprovalModal/GenericItemTable'
import {
  arrayItemLabel,
  ChangeTypeBadge,
  ChangeTypeIcon,
  formatSimpleValue,
  getCategoryIcon,
  isSimpleValue,
} from '@/domains/storyteller/ui/ActionApprovalModal/action-approval-helpers'

interface ApprovalModalSummaryPanelProps {
  changesByCategory: Record<string, ActionChange[]>
  changes: ActionChange[]
  expandedSections: Set<string>
  toggleSection: (section: string) => void
  setExpandedSections: React.Dispatch<React.SetStateAction<Set<string>>>
  onOpenDiff: (changeIndex: number) => void
  shouldUseTableView: (category: string, categoryChanges: ActionChange[]) => boolean
}

const CategoryChangeRow: React.FC<{
  change: ActionChange
  onOpenDiff: (changeIndex: number) => void
  changeIndex: number
}> = ({ change, onOpenDiff, changeIndex }) => (
  <div className="p-4">
    <div className="flex items-start gap-3">
      <ChangeTypeIcon type={change.changeType} />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-2">
          <span className="font-medium text-sm">{change.friendlyName}</span>
          <ChangeTypeBadge type={change.changeType} />
        </div>

        {change.summary ? (
          <p className="text-sm text-muted-foreground">{change.summary}</p>
        ) : isSimpleValue(change.after) ? (
          <div className="flex items-center gap-2 text-sm">
            {change.before !== null && (
              <>
                <span className="px-2 py-1 bg-red-500/10 text-red-400 rounded line-through">
                  {formatSimpleValue(change.before)}
                </span>
                <ArrowRight className="w-4 h-4 text-muted-foreground" />
              </>
            )}
            <span className="px-2 py-1 bg-green-500/10 text-green-400 rounded">
              {formatSimpleValue(change.after)}
            </span>
          </div>
        ) : Array.isArray(change.after) ? (
          <div className="mt-2 space-y-1">
            {change.after.slice(0, 5).map((item, itemIndex) => (
              <div key={itemIndex} className="flex items-center gap-2 text-sm">
                <Plus className="w-3 h-3 text-green-400" />
                <span className="text-foreground/80">{arrayItemLabel(item)}</span>
              </div>
            ))}
            {change.after.length > 5 && (
              <span className="text-xs text-muted-foreground">
                +{change.after.length - 5} more items
              </span>
            )}
          </div>
        ) : (
          <Button
            variant="outline"
            size="sm"
            className="mt-2 h-7 text-xs"
            onClick={() => onOpenDiff(changeIndex)}
          >
            <Code className="w-3 h-3 mr-1" />
            View Details
          </Button>
        )}
      </div>
    </div>
  </div>
)

export const ApprovalModalSummaryPanel: React.FC<ApprovalModalSummaryPanelProps> = ({
  changesByCategory,
  changes,
  expandedSections,
  toggleSection,
  setExpandedSections,
  onOpenDiff,
  shouldUseTableView,
}) => (
  <div className="h-full overflow-auto p-6">
    <div className="space-y-4">
      {Object.entries(changesByCategory).map(([category, categoryChanges]) => (
        <div key={category} className="border border-border/50 rounded-lg overflow-hidden">
          <button
            className="w-full flex items-center justify-between p-4 bg-muted/30 hover:bg-muted/50 transition-colors"
            onClick={() => toggleSection(category)}
          >
            <div className="flex items-center gap-3">
              {getCategoryIcon(category)}
              <span className="font-medium">{category}</span>
              <span className="text-xs text-muted-foreground">
                ({categoryChanges.length} change{categoryChanges.length > 1 ? 's' : ''})
              </span>
            </div>
            {expandedSections.has(category) ? (
              <ChevronUp className="w-4 h-4 text-muted-foreground" />
            ) : (
              <ChevronDown className="w-4 h-4 text-muted-foreground" />
            )}
          </button>

          {expandedSections.has(category) && (
            <div className="divide-y divide-border/30">
              {shouldUseTableView(category, categoryChanges) ? (
                <div className="p-0">
                  <GenericItemTable changes={categoryChanges} />
                </div>
              ) : (
                categoryChanges.map((change, idx) => {
                  const changeIndex = changes.findIndex(entry => entry === change)
                  return (
                    <CategoryChangeRow
                      key={idx}
                      change={change}
                      changeIndex={changeIndex}
                      onOpenDiff={onOpenDiff}
                    />
                  )
                })
              )}
            </div>
          )}
        </div>
      ))}
    </div>

    {Object.keys(changesByCategory).length > 0 && (
      <div className="mt-4 text-center">
        <Button
          variant="ghost"
          size="sm"
          className="text-xs"
          onClick={() => {
            if (expandedSections.size === Object.keys(changesByCategory).length) {
              setExpandedSections(new Set())
            } else {
              setExpandedSections(new Set(Object.keys(changesByCategory)))
            }
          }}
        >
          {expandedSections.size === Object.keys(changesByCategory).length
            ? 'Collapse All'
            : 'Expand All'}
        </Button>
      </div>
    )}
  </div>
)

export function openDiffForChange(
  changeIndex: number,
  setCurrentChangeIndex: (index: number) => void,
  setViewMode: (mode: ApprovalViewMode) => void
): void {
  if (changeIndex >= 0) {
    setCurrentChangeIndex(changeIndex)
    setViewMode(ApprovalViewMode.DIFF)
  }
}
