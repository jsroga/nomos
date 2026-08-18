'use client'

import { Loader2 } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/Dialog'
import { cn } from '@/shared/data/utils'
import { ConsistencyFixRunPhase } from './constants/fix-inconsistencies-dialog'
import {
  FixInconsistenciesDialogClass,
  FixInconsistenciesDialogCopy,
} from './constants/fix-inconsistencies-dialog'
import type { ConsistencyFixRunState } from '@/domains/storyteller/state/useStorytellerUiStore'
import { FixInconsistenciesReview } from './FixInconsistenciesReview'
import { FixInconsistenciesDialogFooter } from './FixInconsistenciesDialogFooter'

interface FixInconsistenciesDialogProps {
  run: ConsistencyFixRunState
  onApplyAll: () => void
  onDiscard: () => void
  onCancelScan: () => void
  onClose: () => void
}

function isLockedPhase(phase: ConsistencyFixRunPhase): boolean {
  return phase === ConsistencyFixRunPhase.Scanning || phase === ConsistencyFixRunPhase.Applying
}

function dialogDescription(run: ConsistencyFixRunState): string {
  if (run.phase === ConsistencyFixRunPhase.Scanning) return FixInconsistenciesDialogCopy.Scanning
  if (run.phase === ConsistencyFixRunPhase.Applying) return FixInconsistenciesDialogCopy.Applying
  return run.message || FixInconsistenciesDialogCopy.Title
}

export function FixInconsistenciesDialog({
  run,
  onApplyAll,
  onDiscard,
  onCancelScan,
  onClose,
}: FixInconsistenciesDialogProps) {
  const open = run.phase !== ConsistencyFixRunPhase.Idle
  const locked = isLockedPhase(run.phase)

  return (
    <Dialog
      open={open}
      onOpenChange={nextOpen => {
        if (nextOpen) return
        if (locked) return
        if (run.phase === ConsistencyFixRunPhase.Review) {
          onDiscard()
          return
        }
        onClose()
      }}
    >
      <DialogContent
        className={cn(
          FixInconsistenciesDialogClass.Content,
          locked ? FixInconsistenciesDialogClass.HideClose : undefined
        )}
        onPointerDownOutside={event => {
          if (locked) event.preventDefault()
        }}
        onEscapeKeyDown={event => {
          if (locked) event.preventDefault()
        }}
      >
        <DialogHeader>
          <DialogTitle>{FixInconsistenciesDialogCopy.Title}</DialogTitle>
          <DialogDescription>{dialogDescription(run)}</DialogDescription>
        </DialogHeader>

        {locked ? (
          <div className="flex items-center gap-3 py-6 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            {dialogDescription(run)}
          </div>
        ) : null}

        {run.phase === ConsistencyFixRunPhase.Review ? (
          <FixInconsistenciesReview
            findings={run.findings}
            fixes={run.fixes}
            skipped={run.skipped}
          />
        ) : null}

        {run.phase === ConsistencyFixRunPhase.Done || run.phase === ConsistencyFixRunPhase.Error ? (
          <p className="text-sm text-muted-foreground">{run.error || run.message}</p>
        ) : null}

        <FixInconsistenciesDialogFooter
          phase={run.phase}
          canApply={run.fixes.length > 0}
          onApplyAll={onApplyAll}
          onDiscard={onDiscard}
          onCancelScan={onCancelScan}
          onClose={onClose}
        />
      </DialogContent>
    </Dialog>
  )
}
