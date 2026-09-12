'use client'

import { useEffect, useRef } from 'react'
import { Check, Loader2 } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/Dialog'
import { cn } from '@/shared/data/utils'
import {
  ConsistencyFixRunPhase,
  FixInconsistenciesDialogClass,
  FixInconsistenciesDialogCopy,
  scanningCopyForStep,
} from './utils/fix-inconsistencies-dialog'
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
  if (run.phase === ConsistencyFixRunPhase.Review) {
    if (run.empty) return FixInconsistenciesDialogCopy.Empty
    if (run.findings.length === 0) return FixInconsistenciesDialogCopy.NoFindings
    return FixInconsistenciesDialogCopy.Review
  }
  return run.error || run.message || FixInconsistenciesDialogCopy.Title
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
  const applyingRef = useRef(false)

  useEffect(() => {
    if (run.phase === ConsistencyFixRunPhase.Applying) {
      applyingRef.current = true
      return
    }
    if (
      run.phase === ConsistencyFixRunPhase.Review ||
      run.phase === ConsistencyFixRunPhase.Idle
    ) {
      applyingRef.current = false
    }
  }, [run.phase])

  return (
    <Dialog
      open={open}
      onOpenChange={nextOpen => {
        if (nextOpen) return
        if (applyingRef.current || run.phase === ConsistencyFixRunPhase.Applying) return
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
          if (locked || applyingRef.current) event.preventDefault()
        }}
        onEscapeKeyDown={event => {
          if (locked || applyingRef.current) event.preventDefault()
        }}
      >
        <DialogHeader>
          <DialogTitle>{FixInconsistenciesDialogCopy.Title}</DialogTitle>
          <DialogDescription>{dialogDescription(run)}</DialogDescription>
        </DialogHeader>

        {run.phase === ConsistencyFixRunPhase.Scanning ? (
          <div className={FixInconsistenciesDialogClass.ScanList}>
            {run.completedStepIds.map(stepId => (
              <div key={stepId} className={FixInconsistenciesDialogClass.ScanRow}>
                <Check className={cn('h-4 w-4', FixInconsistenciesDialogClass.ScanDone)} />
                <span>{scanningCopyForStep(stepId)}</span>
              </div>
            ))}
            <div className={FixInconsistenciesDialogClass.ScanRow}>
              <Loader2 className="h-4 w-4 animate-spin" />
              <span className={FixInconsistenciesDialogClass.ScanCurrent}>
                {scanningCopyForStep(run.stepId)}
              </span>
            </div>
          </div>
        ) : null}

        {run.phase === ConsistencyFixRunPhase.Applying ? (
          <div className={FixInconsistenciesDialogClass.ApplyingRow}>
            <Loader2 className="h-4 w-4 animate-spin" />
            {FixInconsistenciesDialogCopy.Applying}
          </div>
        ) : null}

        {run.phase === ConsistencyFixRunPhase.Review ? (
          <FixInconsistenciesReview
            findings={run.findings}
            fixes={run.fixes}
            skipped={run.skipped}
            projectId={run.projectId ?? undefined}
          />
        ) : null}

        {run.phase === ConsistencyFixRunPhase.Done || run.phase === ConsistencyFixRunPhase.Error ? (
          <p className="text-sm text-muted-foreground">{run.error || run.message}</p>
        ) : null}

        <FixInconsistenciesDialogFooter
          phase={run.phase}
          canApply={run.fixes.length > 0}
          onApplyAll={() => {
            applyingRef.current = true
            onApplyAll()
          }}
          onDiscard={onDiscard}
          onCancelScan={onCancelScan}
          onClose={onClose}
        />
      </DialogContent>
    </Dialog>
  )
}
