'use client'

import React, { useState, useEffect, useMemo } from 'react'
import type { WireAgentAction } from '@/shared/agent-kernel/action-wire'
import type { ActionChange } from '@/domains/storyteller/ui/ActionApprovalModal/action-approval-types'
import {
  ActionChangeType,
  ApprovalViewMode,
  CATEGORY_TABLE_VIEW_SET,
  MODAL_DISPLAY_NAME,
} from '@/domains/storyteller/ui/ActionApprovalModal/constants/action-approval-display'
import { extractChanges } from '@/domains/storyteller/ui/ActionApprovalModal/extract-action-changes'
import { useApprovalModalKeyboard } from '@/domains/storyteller/ui/ActionApprovalModal/useApprovalModalKeyboard'
import {
  ApprovalModalSummaryPanel,
  openDiffForChange,
} from '@/domains/storyteller/ui/ActionApprovalModal/ApprovalModalSummaryPanel'
import { ApprovalModalDiffPanel } from '@/domains/storyteller/ui/ActionApprovalModal/ApprovalModalDiffPanel'
import {
  ApprovalModalFooter,
  ApprovalModalHeader,
  ApprovalModalToolbar,
} from '@/domains/storyteller/ui/ActionApprovalModal/ApprovalModalChrome'

interface ActionApprovalModalProps {
  action: WireAgentAction
  agentName: string
  onApprove: () => void
  onReject: () => void
  onClose: () => void
  isOpen: boolean
  isProcessing?: boolean
}

function shouldUseTableView(category: string, categoryChanges: ActionChange[]): boolean {
  if (!CATEGORY_TABLE_VIEW_SET.has(category)) {
    return false
  }
  return categoryChanges.some(
    change =>
      typeof (change.after || change.before) === 'object' &&
      (change.after || change.before) !== null &&
      !Array.isArray(change.after || change.before)
  )
}

export const ActionApprovalModal: React.FC<ActionApprovalModalProps> = React.memo(({
  action,
  agentName,
  onApprove,
  onReject,
  onClose,
  isOpen,
  isProcessing = false,
}) => {
  const [currentChangeIndex, setCurrentChangeIndex] = useState(0)
  const [viewMode, setViewMode] = useState<ApprovalViewMode>(ApprovalViewMode.SUMMARY)
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set())
  const [isApproving, setIsApproving] = useState(false)

  useEffect(() => {
    if (isOpen) setIsApproving(false)
  }, [isOpen])

  const handleApprove = async () => {
    setIsApproving(true)
    try {
      await onApprove()
    } finally {
      setIsApproving(false)
    }
  }

  const changes = useMemo(() => extractChanges(action), [action])
  const currentChange = changes[currentChangeIndex]

  const changesByCategory = useMemo(() => {
    const grouped: Record<string, ActionChange[]> = {}
    changes.forEach(change => {
      if (!grouped[change.category]) {
        grouped[change.category] = []
      }
      grouped[change.category].push(change)
    })
    return grouped
  }, [changes])

  const stats = useMemo(() => {
    let adds = 0
    let mods = 0
    let removes = 0
    for (const change of changes) {
      if (change.changeType === ActionChangeType.ADD) adds++
      else if (change.changeType === ActionChangeType.MODIFY) mods++
      else if (change.changeType === ActionChangeType.REMOVE) removes++
    }
    return { adds, mods, removes, total: changes.length }
  }, [changes])

  useApprovalModalKeyboard({
    isOpen,
    viewMode,
    currentChangeIndex,
    changeCount: changes.length,
    onClose,
    onApprove,
    onReject,
    setCurrentChangeIndex,
    setViewMode,
  })

  const toggleSection = (section: string) => {
    setExpandedSections(prev => {
      const next = new Set(prev)
      if (next.has(section)) {
        next.delete(section)
      } else {
        next.add(section)
      }
      return next
    })
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full h-full max-w-[95vw] max-h-[95vh] bg-background border border-border shadow-2xl rounded-lg flex flex-col animate-in zoom-in-95 duration-200">
        <ApprovalModalHeader
          action={action}
          agentName={agentName}
          stats={stats}
          onClose={onClose}
        />

        <ApprovalModalToolbar
          viewMode={viewMode}
          setViewMode={setViewMode}
          currentChangeIndex={currentChangeIndex}
          changeCount={changes.length}
          setCurrentChangeIndex={setCurrentChangeIndex}
        />

        <div className="flex-1 overflow-hidden">
          {viewMode === ApprovalViewMode.SUMMARY ? (
            <ApprovalModalSummaryPanel
              changesByCategory={changesByCategory}
              changes={changes}
              expandedSections={expandedSections}
              toggleSection={toggleSection}
              setExpandedSections={setExpandedSections}
              onOpenDiff={changeIndex =>
                openDiffForChange(changeIndex, setCurrentChangeIndex, setViewMode)
              }
              shouldUseTableView={shouldUseTableView}
            />
          ) : (
            <ApprovalModalDiffPanel currentChange={currentChange} />
          )}
        </div>

        <ApprovalModalFooter
          viewMode={viewMode}
          changeCount={changes.length}
          onReject={onReject}
          onApprove={handleApprove}
          isProcessing={isProcessing}
          isApproving={isApproving}
        />
      </div>
    </div>
  )
})

ActionApprovalModal.displayName = MODAL_DISPLAY_NAME
