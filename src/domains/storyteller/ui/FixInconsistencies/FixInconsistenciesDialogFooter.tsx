'use client'

import { Button } from '@/components/Button'
import {
  ButtonSizeKey,
  ButtonVariantKey,
} from '@/components/Button/constants/button-styles'
import { DialogFooter } from '@/components/Dialog'
import { ConsistencyFixRunPhase } from './constants/fix-inconsistencies-dialog'
import { FixInconsistenciesDialogCopy } from './constants/fix-inconsistencies-dialog'

interface FixInconsistenciesDialogFooterProps {
  phase: ConsistencyFixRunPhase
  canApply: boolean
  onApplyAll: () => void
  onDiscard: () => void
  onCancelScan: () => void
  onClose: () => void
}

export function FixInconsistenciesDialogFooter({
  phase,
  canApply,
  onApplyAll,
  onDiscard,
  onCancelScan,
  onClose,
}: FixInconsistenciesDialogFooterProps) {
  return (
    <DialogFooter>
      {phase === ConsistencyFixRunPhase.Scanning ? (
        <Button variant={ButtonVariantKey.Outline} size={ButtonSizeKey.Sm} onClick={onCancelScan}>
          {FixInconsistenciesDialogCopy.Cancel}
        </Button>
      ) : null}
      {phase === ConsistencyFixRunPhase.Review ? (
        <>
          <Button variant={ButtonVariantKey.Outline} size={ButtonSizeKey.Sm} onClick={onDiscard}>
            {FixInconsistenciesDialogCopy.Discard}
          </Button>
          <Button
            variant={ButtonVariantKey.Default}
            size={ButtonSizeKey.Sm}
            onClick={onApplyAll}
            disabled={!canApply}
          >
            {FixInconsistenciesDialogCopy.ApplyAll}
          </Button>
        </>
      ) : null}
      {phase === ConsistencyFixRunPhase.Done || phase === ConsistencyFixRunPhase.Error ? (
        <Button variant={ButtonVariantKey.Default} size={ButtonSizeKey.Sm} onClick={onClose}>
          {FixInconsistenciesDialogCopy.Close}
        </Button>
      ) : null}
    </DialogFooter>
  )
}
